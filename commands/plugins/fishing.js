const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Servers = require("../../models/servers");
const icon = process.env.ICON;

const check = process.env.CHECK;
const uncheck = process.env.UNCHECK;
const {
  memberPermissions,
  premiumAccess,
  checkMaintenance,
  rateLimited,
} = require("../../utilities/permissions");
const { sendProcessing } = require("../../utilities/sendProcess");

module.exports = {
  name: "fishing",
  alias: ["fish"],
  description: "fishing commands features",
  category: ["Plugins"],
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });

      // return state
      if (!serverProfile) return;
      if (await checkMaintenance(message)) return;
      if (await rateLimited(message)) return;
      // if premium commands
      if (!(await premiumAccess(message))) return;

      const action = args[0]?.toLowerCase();
      const config = serverProfile.plugins.fishing;
      const economyConfig = serverProfile.plugins.economy;
      if (!economyConfig.enabled) {
        return await message.channel.send(`Economy plugin is required!`);
      }
      const rodIcon = config.rodIcon || "🎣";
      const username = `**${message.author.username}**`;
      switch (action) {
        case "enable": {
          if (!memberPermissions(message)) return;
          if (config.enabled) {
            return await message.channel.send(
              `${uncheck} *${username}. Fishing is already enabled in this server.*`
            );
          }
          config.enabled = true;
          await serverProfile.save();
          return await message.channel.send(
            `${check} *${username}. Fishing is now enabled in this server*`
          );
        }

        case "disable": {
          if (!memberPermissions(message)) return;
          const process = await sendProcessing(message);
          if (!config.enabled) {
            return await process.no(
              `Fishing is already disable in this server.`
            );
          }
          config.enabled = false;
          await serverProfile.save();
          return await process.ok(`Fishing is now disabled in this server.`);
        }

        case "book": {
          // discover fishing looting
          const displayLoots =
            config.loots
              .map((loot) => {
                return `${loot.icon} **${loot.name}**\nUID: ${loot.uid}\nType: ${loot.type}\nChance: ${loot.catchRate}%\nWorth: ${serverProfile.plugins.economy.icon} ${loot.price}`;
              })
              .join("\n") || `No loots found! try creating some.`;
          const embed = new EmbedBuilder()
            .setTitle(`Fish Books`)
            .setDescription(displayLoots)
            .setThumbnail(
              "https://img.freepik.com/premium-vector/pixel-art-book-graphic-icon-gaming-apps-digital-projects_1292377-13079.jpg?w=360"
            );
          return message.channel.send({ embeds: [embed] });
        }

        case "rodprice": {
          if (!memberPermissions(message)) return;
          // Parse the new price
          const newPrice = parseInt(args[1]);

          // Validate input
          if (isNaN(newPrice)) {
            return message.channel.send(
              `${uncheck} Missing command arguments\nUsage: \`!fishing rod {newPrice}\``
            );
          }

          if (newPrice <= 0) {
            return message.channel.send(
              `${uncheck} Price cannot less than zero.`
            );
          }

          // Update the fishing rod price
          config.rodPrice = newPrice;
          await serverProfile.save();

          return message.channel.send(
            `${check} Fishing rod is now can purchase at ${
              serverProfile.currency.icon
            } ${formatNumber(newPrice)}.`
          );
        }

        case "newaccount": {
          if (!memberPermissions(message)) return;
          const targetUser = message.mentions.users.first();
          const process = await sendProcessing(message);
          if (!targetUser) {
            return await process.no(`Usage: \`!fishing newaccount @user\``);
          }
          if (targetUser.bot) {
            return await process.no(`Creating bot account is not allowed.`);
          }
          const existingAccount = config.members.find(
            (m) => m.id === targetUser.id
          );
          if (existingAccount) {
            return await process.no(
              `This user is already have fishing account.`
            );
          }
          config.members.push({
            id: targetUser.id,
          });
          await serverProfile.save();
          return await process.ok(
            `**${targetUser.username}** fishing account has been created!`
          );
        }

        case "config": {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Fish Items")
              .setCustomId("fishing_items")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setLabel("Change Fishing Rod Price")
              .setCustomId("fishing_rod_pricing")
              .setStyle(ButtonStyle.Primary)
          );

          const sendMessage = await message.channel.send({
            content: `Welcome to Fishing Admin Panel\nuse the button below to start your server fishing configurator.`,
            components: [row],
          });

          const collector = await sendMessage.createMessageComponentCollector();
          collector.on("collect", async (i) => {
            try {
              await i.deferUpdate();
              if (i.customId === "fishing_items") {
                const row = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setLabel("Back")
                    .setCustomId("fishing_items_back")
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setLabel("Create")
                    .setCustomId("fishing_items_create")
                    .setStyle(ButtonStyle.Primary),
                  new ButtonBuilder()
                    .setLabel("Down")
                    .setCustomId("fishing_items_down")
                    .setStyle(ButtonStyle.Secondary),
                  new ButtonBuilder()
                    .setLabel("Up")
                    .setCustomId("fishing_items_up")
                    .setStyle(ButtonStyle.Secondary)
                );
                const row2 = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setLabel("Next Page")
                    .setCustomId("fishing_items_nextpage")
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setLabel("Previous Page")
                    .setCustomId("fishing_items_previouspage")
                    .setStyle(ButtonStyle.Primary),
                  new ButtonBuilder()
                    .setLabel("Select & Edit")
                    .setCustomId("fishing_items_edit")
                    .setStyle(ButtonStyle.Primary)
                );
                await sendMessage.edit({
                  content: `Welcome to shop panel.`,
                  components: [row, row2],
                });
              }
              if (i.customId === "fishing_items_back") {
                await sendMessage.edit({
                  content: `Welcome to Fishing Admin Panel\nuse the button below to start your server fishing configurator.`,
                  components: [row],
                });
              }
            } catch (error) {
              console.error(error);
            }
          });
          return;
        }

        case "create": {
          if (!memberPermissions(message)) return;

          // Helper to send a prompt and wait for a single response from the command author
          const collectInput = async (
            promptText,
            { validate, parse } = {},
            timeout = 120_000 // handler for 2 minutes
          ) => {
            const prompt = await message.channel.send(
              promptText + "\nType `cancel` to abort."
            );
            try {
              const filter = (m) => m.author.id === message.author.id;
              const collected = await message.channel.awaitMessages({
                filter,
                max: 1,
                time: timeout,
                errors: ["time"],
              });
              const reply = collected.first().content.trim();

              if (reply.toLowerCase() === "cancel") {
                await message.channel.send("❌ Creation cancelled.");
                return { cancelled: true };
              }

              // Optionally parse the raw reply
              const value = parse ? parse(reply) : reply;

              // Optionally validate; should return { ok: true } or { ok: false, reason: '...' }
              if (validate) {
                const check = await validate(value);
                if (!check.ok) {
                  await message.channel.send(`⚠️ ${check.reason}`);
                  return { invalid: true, reason: check.reason };
                }
              }

              return { value };
            } catch (err) {
              // Timeout
              await message.channel.send(
                "⏱️ You took too long to respond. Creation aborted."
              );
              return { timedout: true };
            }
          };

          try {
            // If UID provided in args use it, otherwise collect
            let uid = args[1] ? parseInt(args[1], 10) : null;
            if (args[1] && (isNaN(uid) || uid <= 0)) {
              return message.channel.send(
                "❌ Provided `UID` is invalid. It must be a positive integer."
              );
            }

            // Check provided UID uniqueness
            if (uid) {
              const existingUid = config.loots.find((item) => item.uid === uid);
              if (existingUid) {
                return message.channel.send(
                  `❌ A loot with UID \`${uid}\` already exists: ${
                    existingUid.name || "Unnamed"
                  }`
                );
              }
            } else {
              // collect UID
              while (true) {
                const res = await collectInput(
                  "Please provide a unique numeric UID for this loot (e.g. 101):",
                  {
                    validate: (v) => {
                      const n = parseInt(v, 10);
                      if (isNaN(n) || n <= 0)
                        return {
                          ok: false,
                          reason: "UID must be a positive number.",
                        };
                      if (config.loots.some((i) => i.uid === n))
                        return {
                          ok: false,
                          reason: "That UID already exists.",
                        };
                      return { ok: true };
                    },
                    parse: (v) => parseInt(v, 10),
                  }
                );
                if (res.cancelled || res.timedout) return;
                if (res.invalid) continue;
                uid = res.value;
                break;
              }
            }

            // Collect name (allow args[2] as fallback)
            let name = args[2] ? args.slice(2).join(" ") : null;
            if (!name) {
              const res = await collectInput(
                "Enter the loot name (human readable):",
                {
                  validate: (v) => {
                    if (!v || v.length < 1)
                      return { ok: false, reason: "Name cannot be empty." };
                    if (v.length > 25)
                      return {
                        ok: false,
                        reason: "Name must be <= 25 characters.",
                      };
                    return { ok: true };
                  },
                }
              );
              if (res.cancelled || res.timedout) return;
              if (res.invalid) return;
              name = res.value;
            }

            // Collect icon (optional)
            const resIcon = await collectInput(
              "Provide an icon URL or emoji for this loot. Reply `none` to skip.",
              {
                validate: (v) => {
                  if (v.toLowerCase() === "none") return { ok: true };
                  // allow unicode emoji or <:name:id>
                  if (/^<a?:\w+:\d+>$/.test(v) || /\p{Emoji}/u.test(v))
                    return { ok: true };
                  return {
                    ok: false,
                    reason: "Provide a valid emoji, or `none`.",
                  };
                },
              }
            );
            if (resIcon.cancelled || resIcon.timedout) return;
            const icon =
              resIcon.value && resIcon.value.toLowerCase() !== "none"
                ? resIcon.value
                : null;

            // Collect description
            const resDesc = await collectInput(
              "Provide a short description for this loot (max 256 chars):",
              {
                validate: (v) => {
                  if (!v)
                    return {
                      ok: false,
                      reason: "Description cannot be empty.",
                    };
                  if (v.length > 256)
                    return {
                      ok: false,
                      reason: "Description must be <= 256 characters.",
                    };
                  return { ok: true };
                },
              }
            );
            if (resDesc.cancelled || resDesc.timedout) return;
            const description = resDesc.value;

            // Collect price (optional, numeric)
            const resPrice = await collectInput(
              "Set the price (numeric) of this loot (e.g. 250). Reply `0` for free:",
              {
                validate: (v) => {
                  const n = parseInt(v, 10);
                  if (isNaN(n) || n < 0)
                    return {
                      ok: false,
                      reason: "Price must be a non-negative integer.",
                    };
                  return { ok: true };
                },
                parse: (v) => parseInt(v, 10),
              }
            );
            if (resPrice.cancelled || resPrice.timedout) return;
            const price = resPrice.value;

            // ✅ NEW: Collect catchRate
            const resCatchRate = await collectInput(
              "Set the catch rate (1–99). This defines how rare or hard this loot is to catch:",
              {
                validate: (v) => {
                  const n = parseInt(v, 10);
                  if (isNaN(n) || n < 1 || n > 99)
                    return {
                      ok: false,
                      reason: "Catch rate must be a number between 1 and 99.",
                    };
                  return { ok: true };
                },
                parse: (v) => parseInt(v, 10),
              }
            );
            if (resCatchRate.cancelled || resCatchRate.timedout) return;
            const catchRate = resCatchRate.value;

            // Build loot object
            const newLoot = {
              uid,
              name,
              icon,
              description,
              price,
              catchRate,
              createdAt: Date.now(),
            };

            // Save
            config.loots = config.loots || [];
            config.loots.push(newLoot);
            await serverProfile.save();

            const successEmbed = {
              color: 0x22bb33,
              title: "Loot Created",
              description: `Successfully created loot **${name}** (UID: ${uid}).`,
              fields: [
                {
                  name: "Price",
                  value: `${
                    serverProfile.plugins?.economy?.icon || ""
                  } ${price}`,
                  inline: true,
                },
                { name: "UID", value: `${uid}`, inline: true },
                { name: "Catch Rate", value: `${catchRate}%`, inline: true },
                {
                  name: "Icon",
                  value: icon ? `${icon}` : "None",
                  inline: true,
                },
              ],
              timestamp: new Date(),
            };

            return message.channel.send({ embeds: [successEmbed] });
          } catch (err) {
            console.error("Error creating loot:", err);
            return message.channel.send(
              "❌ An unexpected error occurred while creating the loot."
            );
          }
        }

        case "chance": {
          if (!memberPermissions(message)) return;
          // Parse the new chance value
          const newChance = parseInt(args[1]);

          // Validate input
          if (isNaN(newChance) || newChance < 0 || newChance > 100) {
            return message.channel.send(
              `${uncheck} Missing command arguments\nUsage: \`!fishing chance {0 <-> 100}\``
            );
          }
          config.rodBroken = newChance;
          await serverProfile.save();
          return message.channel.send(
            `${check} Fishing rod is now can be broke at chance ${newChance}% during fishing.`
          );
        }

        case "cooldown": {
          const newCooldown = parseInt(args[1]);
          if (isNaN(newCooldown) || !newCooldown) {
            return message.channel.send(
              `${uncheck} Missing command arguments.\nUsage: \`fishing cooldown { newCooldownInSeconds }\``
            );
          }
          config.cooldown = newCooldown;
          await serverProfile.save();
          return message.channel.send(
            `${check} Fishing cooldown are not set default to ${newCooldown} seconds`
          );
        }

        case "resetcooldown": {
          if (!memberPermissions(message)) return;
          const targetUser = message.mentions.users.first();
          if (!targetUser) {
            return await message.channel.send(
              `*Usage: \`!fishing resetcooldown @user\`*`
            );
          }
          const userAccount = config.members.find(
            (m) => m.id === targetUser.id
          );
          if (!userAccount) {
            return await message.channel.send(
              `***${targetUser.username}**. don't have fishing account.*`
            );
          }
          userAccount.cooldown = null;
          await serverProfile.save();
          return await message.channel.send(
            `***${targetUser.username}**. Fishing cooldown has been reset successfully.*`
          );
        }

        case "ban": {
          const targetUser = message.mentions.users.first();
          if (!targetUser) {
            return await message.channel.send(
              `*Usage: \`!fishing ban @user\`*`
            );
          }

          const accountData = config.members.find(
            (m) => m.id === targetUser.id
          );
          if (!accountData) {
            return await message.channel.send(
              `${uncheck} ***${targetUser.username}** does not have a fishing account.*`
            );
          }

          if (accountData.isFish === false) {
            return await message.channel.send(
              `${uncheck} ***${targetUser.username}** is already banned from fishing.*`
            );
          }

          accountData.isFish = false;
          await serverProfile.save();
          return await message.channel.send(
            `${check} ***${message.author.username}**. Successfully banned ${targetUser.username}'s fishing account.*`
          );
        }

        case "unban": {
          const targetUser = message.mentions.users.first();
          if (!targetUser) {
            return await message.channel.send(
              `*Usage: \`!fishing unban @user\`*`
            );
          }

          const accountData = config.members.find(
            (m) => m.id === targetUser.id
          );
          if (!accountData) {
            return await message.channel.send(
              `${uncheck} ***${targetUser.username}** does not have a fishing account.*`
            );
          }

          if (accountData.isFish === true) {
            return await message.channel.send(
              `${uncheck} ***${targetUser.username}** is not banned from fishing.*`
            );
          }

          accountData.isFish = true;
          await serverProfile.save();
          return await message.channel.send(
            `${check} ***${message.author.username}**. Successfully unbanned ${targetUser.username}'s fishing account.*`
          );
        }

        case "inv":
        case "inventory": {
          const userData = config.members.find(
            (m) => m.id === message.author.id
          );

          if (!userData) {
            return await message.channel.send(
              `***${message.author.username}**. You do not have a fishing account.*`
            );
          }

          if (!userData.inventory || userData.inventory.length === 0) {
            return await message.channel.send(
              `***${message.author.username}**. Your inventory is empty.*`
            );
          }

          // Helper function to split array into chunks
          function chunkArray(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
              chunks.push(array.slice(i, i + size));
            }
            return chunks;
          }

          // Build inventory display
          const inventoryItems = userData.inventory
            .map((item) => {
              const loot = config.loots.find((l) => l.uid === item.uid);
              if (!loot) return null;
              return `\`${loot.uid}\`${loot.icon || "❓"}${toSuperscript(
                item.amount
              )}`;
            })
            .filter(Boolean);

          // Split into rows of 5
          const rows = chunkArray(inventoryItems, 5);
          const inventoryDisplay = rows.map((row) => row.join(" ")).join("\n");

          // Send message
          return await message.channel.send({
            content: `***${message.author.username}'s Inventory:***\n${inventoryDisplay}`,
          });
        }

        case "buyrod": {
          const userAccount = config.members.find(
            (m) => m.id === message.author.id
          );
          if (!userAccount) {
            return await message.channel.send(
              `***${message.author.username}**. You do not have fishing account.*`
            );
          }
          const economyAccount = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!economyAccount) {
            return await message.channel.send(
              `***${message.author.username}**. You do not have economy account.*`
            );
          }

          if (economyAccount.mainBalance < config.rodPrice) {
            return await message.channel.send(
              `**${message.author.username}**. You need ${
                economyConfig.icon
              } ${formatNumber(config.rodPrice)} to purchase the fishing rod.*`
            );
          }
          if (userAccount.canFish) {
            return await message.channel.send(
              `***${message.author.username}**. You already have a fishing rod — no need to grab another one.*`
            );
          }
          userAccount.canFish = true;
          economyAccount.mainBalance -= config.rodPrice;
          await serverProfile.save();
          return await message.channel.send(
            `***${
              message.author.username
            }**. You have purchased the ${rodIcon} **Fishing Rod** for ${
              economyConfig.icon
            } ${formatNumber(config.rodPrice)}.*`
          );
        }

        case "sell": {
          const item = parseInt(args[1]);
          if (isNaN(item) || !item) {
            return await message.channel.send(
              `*Usage: \`!fishing sell <itemID> <amount>\`*`
            );
          }

          const userAccount = config.members.find(
            (m) => m.id === message.author.id
          );
          if (!userAccount) {
            return await message.channel.send(
              `***${message.author.username}**. You don’t have a fishing account yet — create one before selling your catch.*`
            );
          }

          const economyAccount = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!economyAccount) {
            return await message.channel.send(
              `***${message.author.username}**. You don’t have an economy account — without it, you can’t receive any ${economyConfig.icon} from your sales.*`
            );
          }

          const itemData = userAccount.inventory.find((i) => i.uid === item);
          if (!itemData) {
            return await message.channel.send(
              `***${message.author.username}**. You don’t have this item in your inventory.*`
            );
          }

          const resourceData = config.loots.find((m) => m.uid === itemData.uid);
          if (!resourceData) {
            return await message.channel.send(
              `***${message.author.username}**. This item no longer exists — it may have been removed by an administrator.*`
            );
          }

          const amountToSell = parseInt(args[2]);
          if (isNaN(amountToSell) || amountToSell <= 0) {
            return await message.channel.send(
              `***${message.author.username}**. Please provide a valid amount to sell. Usage: \`!fishing sell <itemID> <amount>\`*`
            );
          }

          if (itemData.amount < amountToSell) {
            return await message.channel.send(
              `***${message.author.username}**. You don’t have enough of this item to sell that many.*`
            );
          }

          // Calculate total worth
          const totalWorth = resourceData.price * amountToSell;

          // Update inventory and economy
          itemData.amount -= amountToSell;
          economyAccount.mainBalance += totalWorth;

          // Remove item if amount is 0
          if (itemData.amount <= 0) {
            userAccount.inventory = userAccount.inventory.filter(
              (i) => i.uid !== item
            );
          }

          await serverProfile.save();

          // Confirmation message
          return await message.channel.send(
            `***${message.author.username}**. You sold **${amountToSell}x ${
              resourceData.icon || ""
            }${resourceData.name}** for **${
              economyConfig.icon
            }${totalWorth.toLocaleString()}**. Your balance has been updated!*`
          );
        }

        case "delete": {
          const itemId = parseInt(args[1]);
          if (!itemId || isNaN(itemId)) {
            return message.channel.send(
              `⚠️ Please provide a valid item ID to continue.`
            );
          }

          const itemData = config.loots.find((item) => item.uid === itemId);
          if (!itemData) {
            return message.channel.send(
              `❌ I couldn't find any item with ID **${itemId}**.`
            );
          }

          // Ask for confirmation
          await message.channel.send(
            `⚠️ Are you sure you want to delete **item #${itemId} (${itemData.name})**?\n` +
              `All user inventories containing this item will lose it permanently.\n\n` +
              `Please type **yes** to confirm or **no** to cancel.`
          );

          // Confirmation collector
          const filter = (m) => m.author.id === message.author.id;
          const collector = message.channel.createMessageCollector({
            filter,
            time: 15000,
          });

          collector.on("collect", async (m) => {
            const response = m.content.toLowerCase();

            if (response === "yes") {
              try {
                // 1️⃣ Remove from loot list
                config.loots = config.loots.filter(
                  (item) => item.uid !== itemId
                );

                // 2️⃣ Remove from all member inventories
                let affectedUsers = 0;
                for (const member of config.members) {
                  const originalCount = member.inventory?.length || 0;
                  if (originalCount > 0) {
                    member.inventory = member.inventory.filter(
                      (inv) => inv.uid !== itemId
                    );
                    if (member.inventory.length < originalCount)
                      affectedUsers++;
                  }
                }

                // 3️⃣ Save config
                await serverProfile.save();

                await message.channel.send(
                  `✅ Item **#${itemId} (${itemData.name})** has been permanently deleted.\n` +
                    `🧹 Removed from **${affectedUsers}** user inventory(ies).`
                );
              } catch (err) {
                console.error(err);
                await message.channel.send(
                  `❌ An error occurred while deleting the item.`
                );
              }

              collector.stop("confirmed");
            } else if (response === "no") {
              await message.channel.send(
                `❎ Deletion cancelled. No changes were made.`
              );
              collector.stop("cancelled");
            }
          });

          collector.on("end", (_, reason) => {
            if (reason !== "confirmed" && reason !== "cancelled") {
              message.channel.send(
                `⌛ Time’s up! Deletion request for item **#${itemId}** has expired.`
              );
            }
          });

          break;
        }
        default: {
          const fishingConfig = config;
          if (!fishingConfig.enabled) {
            const embed = new EmbedBuilder()
              .setImage(
                "https://img.freepik.com/premium-photo/pond-cut-pixel-backgrounds-landscape-outdoors_53876-494970.jpg?semt=ais_hybrid&w=740&q=80"
              )
              .setDescription(`Fishing are not allowed in this server!`)
              .setTitle(`Retricted Areas`)
              .setColor("Red");
            return await message.channel.send({ embeds: [embed] });
          }

          const userData = fishingConfig.members.find(
            (m) => m.id === message.member.id
          );

          if (!userData) {
            return await message.channel.send(
              `***${message.author.username}**. You do not have fishing account.*`
            );
          }

          if (!userData.isFish) {
            return await message.channel.send(
              `***${message.author.username}**. Your fishing account has been disabled. If you think we made the mistake, please contact your server administrator.*`
            );
          }

          if (!userData.canFish) {
            return message.channel.send({
              content: `***${
                message.author.username
              }**. You don't have a rod yet, to purchase one using \`!fishing buyrod\` for ${
                economyConfig.icon
              } ${formatNumber(config.rodPrice)}.*`,
            });
          }

          if (config.loots.length === 0) {
            return await message.channel.send(
              `*${message.author.username}. There is no fishing in this server*`
            );
          }
          // Cooldown duration (example: 30 seconds)
          const cooldown = config.cooldown * 1000;

          // Check if still in cooldown
          if (Date.now() < userData.cooldown + cooldown) {
            const remainingMs = userData.cooldown + cooldown - Date.now();
            const remainingSec = Math.ceil(remainingMs / 1000);

            const sendMessage = await message.channel.send(
              `***${message.author.username}**. You need to wait **${remainingSec}s** before fishing again.*`
            );
            setTimeout(async () => {
              await sendMessage.delete().catch(() => {});
            }, remainingSec * 1000);
            return;
          }
          // Passed cooldown → update timestamp
          userData.cooldown = Date.now();
          await serverProfile.save();

          const sendMessage = await message.channel.send(
            `***${message.author.username}**. ${rodIcon} Casts the line and wait patiently\nThe water ripples — something is biting...*`
          );

          setTimeout(async () => {
            const fish =
              config.loots[Math.floor(Math.random() * config.loots.length)];
            const existingItem = userData.inventory.find(
              (i) => i.uid === fish.uid
            );
            if (existingItem) existingItem.amount += 1;
            else userData.inventory.push({ uid: fish.uid, amount: 1 });

            function isRodBroken(rodChance = config.rodBroken || 10) {
              return Math.random() * 100 < rodChance;
            }

            const brokenRodResponses = [
              "Oh no! Your fishing rod snapped! You'll need a new one to keep fishing.",
              "Crack! Your fishing rod just broke… time to get a replacement.",
              "Your trusty fishing rod is broken. Better patch it up or buy a new one!",
              "Snap! Your fishing rod couldn't handle the catch and broke.",
              "Disaster! Your fishing rod broke while reeling in a fish.",
            ];

            let brokenRodResponse = ``;
            if (isRodBroken()) {
              userData.canFish = false;
              brokenRodResponse = `\n${
                brokenRodResponses[
                  Math.floor(Math.random() * brokenRodResponses.length)
                ]
              }`;
            }

            await serverProfile.save();

            const reply = getRandomResponse(fish.type || "fish");

            return await sendMessage.edit(
              `***${
                message.author.username
              }**. ${rodIcon} Casts the line and wait patiently\nThe water ripples — something is biting... Congratulation you have caught a ${
                fish.icon || ""
              } **${fish.name}**.${brokenRodResponse}\n> ${reply}*`
            );
          }, 1500);
        }
      }
    } catch (error) {
      if (error.code === 50013) return;
      console.error(error);
      await message.reply(`Something went wrong try again later!`);
    }
  },
};

function getRandomResponse(type) {
  const basedResponse = [
    {
      name: "fish",
      responses: [
        "+ added into your inventory",
        "You caught a shiny one! Stored safely.",
        "Nice catch! It's swimming in your bag now",
      ],
    },
    {
      name: "trash",
      responses: [
        "Ew, trash... throw it back into the water",
        "You found junk! Tossed it away",
      ],
    },
    {
      name: "items",
      responses: [
        "You discovered a mysterious item ✨",
        "An old relic surfaces from the deep",
        "You picked up something interesting",
      ],
    },
  ];
  const found = basedResponse.find((r) => r.name === type);
  if (!found)
    return "I don't recognize this item, so I’ll either keep it or throw it away.";
  const random =
    found.responses[Math.floor(Math.random() * found.responses.length)];
  return random;
}

function formatNumber(number) {
  return number.toLocaleString();
}

function toSuperscript(num) {
  const superMap = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
  };
  return num
    .toString()
    .split("")
    .map((n) => superMap[n] || n)
    .join("");
}

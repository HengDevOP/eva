const Servers = require("../../models/servers");
const {
  handlerSetup,
  premiumAccess,
  memberPermissions,
  convertEmoji,
} = require("../../utilities/permissions");

const {
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonStyle,
} = require("discord.js");

const queue = new Map();

module.exports = {
  name: "farming",
  description: "Farming Plugin",
  alias: ["f", "farm"],
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return handlerSetup(message);

      if (!premiumAccess(message)) return;

      const action = args[0]?.toLowerCase();

      const config = serverProfile.plugins.farming;
      const economyConfig = serverProfile.plugins.economy;
      if (!economyConfig.enabled) {
        return message.channel.send(`Economy Plugin is required.`);
      }
      const now = Date.now();

      if (queue.has(message.author.id)) {
        const expirationTime =
          queue.get(message.author.id) + config.cooldown || 5000;
        if (now < expirationTime) {
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          const warningMessage = await message.channel.send(
            `${message.author.username}, please wait **${timeLeft}s**.`
          );
          setTimeout(
            () => warningMessage.delete().catch(() => {}),
            expirationTime - now
          );
          return;
        }
      }

      queue.set(message.author.id, now);

      switch (action) {
        case "enable": {
          if (!memberPermissions(message)) return;
          if (config.enabled) {
            return message.channel.send(
              `Farming is already enabled in this server.`
            );
          }
          config.enabled = true;
          await serverProfile.save();
          return message.channel.send(`Farming is now enabled in this server.`);
        }

        case "disable": {
          if (!memberPermissions(message)) return;
          if (!config.enabled) {
            return message.channel.send(
              `Farming is not enabled in this server.`
            );
          }
          config.enabled = false;
          await serverProfile.save();
          return message.channel.send(
            `Farming is now disabled in this server.`
          );
        }

        case "shop": {
          if (!config.enabled) {
            return message.channel.send(
              `Farming is not enabled in this server.`
            );
          }

          const ITEMS_PER_PAGE = 3; // number of items shown per page
          let currentPage = 0;

          // ✅ Sort items first
          const sortedShop = config.shop.sort((a, b) => {
            const typeA = a.type?.toLowerCase() || "";
            const typeB = b.type?.toLowerCase() || "";
            if (typeA < typeB) return -1;
            if (typeA > typeB) return 1;
            const priceA = a.buyPrice || 0;
            const priceB = b.buyPrice || 0;
            return priceA - priceB;
          });

          if (sortedShop.length === 0)
            return message.channel.send("🛒 No Custom Shop Items.");

          const totalPages = Math.ceil(sortedShop.length / ITEMS_PER_PAGE);

          const generatePage = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const items = sortedShop.slice(start, end);

            const description = items
              .map((item) => {
                return `${item.uid}. ${convertEmoji(item.icon) || "[Icon]"} ${
                  item.name || "No Name"
                }
Type: *${item.type || "Unknown"}*
Buyable: *${item.isPurchase ? "Yes" : "No"}*
BuyPrice: ${serverProfile.plugins.economy.icon} *${item.buyPrice || 0}*
SellPrice: ${serverProfile.plugins.economy.icon} *${item.sellPrice || 0}*
Ready: ${formatDuration(item.ready || 0)}`;
              })
              .join("\n\n");

            return new EmbedBuilder()
              .setTitle("🌾 Farming Shop")
              .setColor("Green")
              .setDescription(description)
              .setFooter({
                text: `Page ${page + 1} / ${totalPages}`,
              });
          };

          const getButtons = (page) => {
            return new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("first")
                .setLabel("<<")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("<")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId("next")
                .setLabel(">")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1),
              new ButtonBuilder()
                .setCustomId("last")
                .setLabel(">>")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1)
            );
          };

          // Send initial message
          const embedMessage = await message.channel.send({
            embeds: [generatePage(currentPage)],
            components: [getButtons(currentPage)],
          });

          // Create button collector
          const collector = embedMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 120_000, // 2 minutes timeout
          });

          collector.on("collect", async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.customId === "first") currentPage = 0;
            if (interaction.customId === "prev") currentPage--;
            if (interaction.customId === "next") currentPage++;
            if (interaction.customId === "last") currentPage = totalPages - 1;

            await interaction.update({
              embeds: [generatePage(currentPage)],
              components: [getButtons(currentPage)],
            });
          });

          collector.on("end", async () => {
            try {
              await embedMessage.edit({
                components: [
                  new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                      .setCustomId("expired")
                      .setLabel("Session Expired")
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(true)
                  ),
                ],
              });
            } catch (e) {}
          });

          break;
        }

        case "create": {
          if (!memberPermissions(message)) return;
          const targetId = parseInt(args[1]);
          if (isNaN(targetId) || !targetId || targetId <= 0) {
            return message.channel.send(`Unqiue ID not support try different.`);
          }
          const existingUID = config.shop.find((item) => item.uid === targetId);
          if (existingUID) {
            return message.channel.send(
              `Unique ID is existing for ${existingUID.icon || "[Icon]"} ${
                existingUID.name || "No Name"
              }`
            );
          }

          if (config.shop.length >= 100) {
            return message.channel.send(
              `You have reached limited of items shop.`
            );
          }
          config.shop.push({
            uid: targetId,
          });

          await serverProfile.save();
          return message.channel.send(
            `Farming items has been created for UID: ${targetId}`
          );
        }

        case "config": {
          if (!memberPermissions(message)) return;
          const targetId = parseInt(args[1]);
          if (isNaN(targetId) || !targetId) {
            return message.channel.send(`Invaid Item Id.`);
          }
          const itemData = config.shop.find((item) => item.uid === targetId);
          if (!itemData) {
            return message.channel.send(
              `ItemData is not existing for this ID.`
            );
          }
          const action = args[2]?.toLowerCase();
          switch (action) {
            // ✅ Update item name
            case "name": {
              const newName = args[3]?.toLowerCase();
              if (!newName)
                return message.channel.send(
                  `Usage: !farming config ${targetId} name \`{ newName }\``
                );

              if (newName.length > 30)
                return message.channel.send(
                  `❌ Item name is too long (max 30 chars).`
                );

              itemData.name = newName;

              await serverProfile.save();
              return message.channel.send(
                `✅ Item name updated to **${itemData.name}**.`
              );
            }

            // ✅ Update icon
            case "icon": {
              const newIcon = args[3];
              if (!newIcon)
                return message.channel.send(
                  `Usage: !farming config ${targetId} icon \`{ discordEmoji }\``
                );

              if (newIcon.toLowerCase() === "none") {
                itemData.icon = null;
              } else {
                itemData.icon = newIcon;
              }

              await serverProfile.save();
              return message.channel.send(`✅ Icon updated successfully.`);
            }

            // ✅ Update description/info
            case "info": {
              const newDesc = args.slice(3).join(" ").trim();
              if (!newDesc)
                return message.channel.send(
                  `Usage: !farming config ${targetId} info \`{ new description }\``
                );

              if (newDesc.length > 256)
                return message.channel.send(
                  `❌ Description too long (max 256 characters).`
                );

              itemData.description = newDesc;
              await serverProfile.save();
              return message.channel.send(`✅ Item description updated.`);
            }

            // ✅ Toggle buyable status
            case "buy": {
              const toggle = args[3]?.toLowerCase();
              if (!toggle || !["on", "off", "true", "false"].includes(toggle))
                return message.channel.send(
                  `Usage: !farming config ${targetId} buy \`{ on | off }\``
                );

              itemData.isPurchase = toggle === "on" || toggle === "true";
              await serverProfile.save();
              return message.channel.send(
                `✅ Item is now ${
                  itemData.isPurchase ? "buyable" : "not buyable"
                }.`
              );
            }

            // ✅ Update buy price
            case "price": {
              const newPrice = parseInt(args[3]);
              if (isNaN(newPrice) || newPrice < 0)
                return message.channel.send(
                  `Usage: !farming config ${targetId} price \`{ positive number }\``
                );

              itemData.buyPrice = newPrice;
              await serverProfile.save();
              return message.channel.send(
                `✅ Buy price set to ${serverProfile.plugins.economy.icon} **${newPrice}**.`
              );
            }

            // ✅ Update sell price (cost)
            case "cost": {
              const newCost = parseInt(args[3]);
              if (isNaN(newCost) || newCost < 0)
                return message.channel.send(
                  `Usage: !farming config ${targetId} cost \`{ positive number }\``
                );

              itemData.sellPrice = newCost;
              await serverProfile.save();
              return message.channel.send(
                `✅ Sell price set to ${serverProfile.plugins.economy.icon} **${newCost}**.`
              );
            }

            // 🧭 Default help message
            default: {
              return message.channel.send(
                `Usage: !farming config ${targetId} \`{ name | icon | info | buy | price | cost }\``
              );
            }
          }
        }

        case "sell": {
          if (!config.enabled) {
            return message.channel.send(
              `❌ Farming is not enabled in this server.`
            );
          }

          // Fetch user farm profile
          const userFarmProfile = config.farming.find(
            (farm) => farm.uid === message.author.id
          );
          if (!userFarmProfile) {
            return message.channel.send(`❌ You do not own a farm yet.`);
          }

          if (!userFarmProfile.enabled) {
            return message.channel.send(
              `❌ Your farm is disabled and cannot sell items.`
            );
          }

          // Get user's economy profile
          const economyProfile = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!economyProfile) {
            return message.channel.send(
              `❌ Could not find your economy profile.`
            );
          }

          // Validate arguments
          const targetId = parseInt(args[1]);
          if (isNaN(targetId) || targetId <= 0) {
            return message.channel.send(`❌ Invalid item ID provided.`);
          }

          const sellAmount = Math.max(1, parseInt(args[2]) || 1);

          // Find item in user's farm inventory
          const itemData = userFarmProfile.inventory?.find(
            (item) => item.uid === targetId
          );
          if (!itemData) {
            return message.channel.send(
              `❌ I couldn't find that item in your farm inventory.`
            );
          }

          if (itemData.amount < sellAmount) {
            return message.channel.send(
              `⚠️ You don't have enough of that item to sell **x${sellAmount}**.`
            );
          }

          // Find the shop item profile
          const itemProfile = config.shop.find((item) => item.uid === targetId);
          if (!itemProfile) {
            return message.channel.send(
              `❌ This item no longer exists in the shop.`
            );
          }

          if (
            typeof itemProfile.sellPrice !== "number" ||
            itemProfile.sellPrice <= 0
          ) {
            return message.channel.send(
              `⚠️ This item cannot be sold (no sell price set).`
            );
          }

          // Calculate total value
          const totalPrice = sellAmount * itemProfile.sellPrice;

          // Update inventory
          itemData.amount -= sellAmount;
          if (itemData.amount <= 0) {
            // Remove item completely if amount hits 0
            userFarmProfile.inventory = userFarmProfile.inventory.filter(
              (item) => item.uid !== itemData.uid
            );
          }

          // Update economy balance
          economyProfile.mainBalance += totalPrice;

          // Save data
          await serverProfile.save();

          // Respond
          return message.channel.send(
            `💰 You sold **x${sellAmount} ${itemProfile.icon || ""} ${
              itemProfile.name || "Unknown"
            }** for **${serverProfile.plugins.economy.icon} ${formatNumber(
              totalPrice
            )}**!`
          );
        }

        case "buy": {
          if (!config.enabled) {
            return message.channel.send(
              `❌ Farming is not enabled in this server.`
            );
          }

          // Fetch user farm profile
          const userFarmProfile = config.farming.find(
            (farm) => farm.uid === message.author.id
          );
          if (!userFarmProfile) {
            return message.channel.send(`❌ You do not own a farm yet.`);
          }

          if (!userFarmProfile.enabled) {
            return message.channel.send(
              `❌ Your farm is disabled and cannot make purchases.`
            );
          }

          // Validate item ID
          const itemId = parseInt(args[1]);
          if (isNaN(itemId) || itemId <= 0) {
            return message.channel.send(`❌ Invalid Item ID provided.`);
          }

          const itemProfile = config.shop.find((item) => item.uid === itemId);
          if (!itemProfile) {
            return message.channel.send(
              `❌ The item with ID \`${itemId}\` does not exist.`
            );
          }

          // Check if item is purchasable
          if (!itemProfile.isPurchase) {
            return message.channel.send(`❌ This item cannot be purchased.`);
          }

          // Fetch user economy profile
          const userProfile = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!userProfile) {
            return message.channel.send(
              `❌ You do not have an economy account.`
            );
          }

          if (userProfile.mainBalance < itemProfile.buyPrice) {
            return message.channel.send(
              `❌ You do not have enough balance to buy this item.\n` +
                `Required: ${serverProfile.plugins.economy.icon} ${itemProfile.buyPrice}\n` +
                `Your Balance: ${serverProfile.plugins.economy.icon} ${userProfile.mainBalance}`
            );
          }

          // Check farm limit
          const maxLand = 25;
          if (userFarmProfile.land.length >= maxLand) {
            return message.channel.send(
              `❌ Your farm has reached the maximum planting capacity (${maxLand} slots).`
            );
          }

          // Deduct balance
          userProfile.mainBalance -= itemProfile.buyPrice || 0;

          // Add item to farm land with ready timestamp
          userFarmProfile.land.push({
            uid: itemId,
            ready: new Date(Date.now() + (itemProfile.ready || 0) * 60 * 1000),
          });

          await serverProfile.save();

          return message.channel.send(
            `✅ You have successfully bought **${
              itemProfile.icon || "[Icon]"
            } ${itemProfile.name || "No Name"}**.\n` +
              `It will be ready to harvest in **${formatDuration(
                itemProfile.ready || 0
              )}**.`
          );
        }

        case "createland": {
          if (!memberPermissions(message)) return;
          const targetUser = message.mentions.users.first();
          if (!targetUser) {
            return message.channel.send(
              `❌ Please mention a user to create their farming land.`
            );
          }

          const existingFarm = config.farming.find(
            (f) => f.uid === targetUser.id
          );
          if (existingFarm) {
            return message.channel.send(
              `⚠️ ${targetUser.username} already has a farming land.`
            );
          }

          // Create new farm for the user
          config.farming.push({
            uid: targetUser.id,
            enabled: true,
            land: [],
            inventory: [],
          });

          await serverProfile.save();

          return message.channel.send(
            `✅ Farming land successfully created for **${targetUser.username}**.`
          );
        }

        case "collect": {
          const targetIndex = parseInt(args[1]);
          if (isNaN(targetIndex) || targetIndex < 1) {
            return message.channel.send(
              `❌ Please provide a valid item index to collect.`
            );
          }

          // Fetch user farm profile
          const farmProfile = config.farming.find(
            (farm) => farm.uid === message.author.id
          );
          if (!farmProfile) {
            return message.channel.send(`❌ You do not own any farm.`);
          }

          if (!farmProfile.enabled) {
            return message.channel.send(
              `❌ Your farm has been disabled and you cannot collect items.`
            );
          }

          // Check if there are any items planted
          if (!farmProfile.land || farmProfile.land.length === 0) {
            return message.channel.send(
              `🌱 You don’t have any planted items to collect.`
            );
          }

          // Convert user input index (1-based) to array index (0-based)
          const index = targetIndex - 1;
          const plantedItem = farmProfile.land[index];
          if (!plantedItem) {
            return message.channel.send(
              `❌ No planted item found at position #${targetIndex}.`
            );
          }

          const now = new Date();
          const readyTime = new Date(plantedItem.ready);

          // Check if ready to collect
          if (readyTime > now) {
            const remaining = readyTime - now;
            return message.channel.send(
              `⏳ This item is not ready yet. Time remaining: **${formatDuration(
                Math.ceil(remaining / 1000 / 60)
              )}**`
            );
          }

          // Find item data from shop
          const itemData = config.shop.find(
            (item) => item.uid === plantedItem.uid
          );
          if (!itemData) {
            return message.channel.send(
              `❌ The item data for this plant no longer exists.`
            );
          }

          // Remove ONLY that specific land slot
          farmProfile.land.splice(index, 1);

          // Initialize inventory if needed
          farmProfile.inventory = farmProfile.inventory || [];

          // Check if already exists in inventory
          const existingInventoryItem = farmProfile.inventory.find(
            (item) => item.uid === itemData.uid
          );

          if (existingInventoryItem) {
            existingInventoryItem.amount =
              (existingInventoryItem.amount || 1) + 1;
          } else {
            farmProfile.inventory.push({
              uid: itemData.uid,
              name: itemData.name,
              icon: itemData.icon,
              amount: 1,
            });
          }

          await serverProfile.save();

          return message.channel.send(
            `✅ You successfully collected **${itemData.icon || "[Icon]"} ${
              itemData.name || "No Name"
            }** and added it to your inventory.`
          );
        }

        case "inventory":
        case "inv": {
          if (!config.enabled) {
            return message.channel.send(
              `❌ Farming is not enabled in this server.`
            );
          }

          const farmProfile = config.farming.find(
            (farm) => farm.uid === message.author.id
          );
          if (!farmProfile) {
            return message.channel.send(`❌ You do not own a farm yet.`);
          }

          if (!farmProfile.enabled) {
            return message.channel.send(
              `❌ Your farm has been disabled and cannot view inventory.`
            );
          }

          const inventory = farmProfile.inventory || [];

          if (inventory.length === 0) {
            return message.channel.send(`🛒 Your farm inventory is empty.`);
          }

          // Build inventory display
          const inventoryDisplay = inventory
            .map((item, index) => {
              const itemData = config.shop.find((i) => i.uid === item.uid);
              if (itemData) {
                return `${index + 1}. ${itemData.icon || "[Icon]"} **${
                  itemData.name
                }** x${item.amount || 1}`;
              }
            })
            .join("\n");

          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Farm Inventory`)
            .setColor("Green")
            .setDescription(inventoryDisplay)
            .setTimestamp();

          return message.channel.send({ embeds: [embed] });
        }

        default: {
          if (!config.enabled) {
            return message.channel.send(
              `❌ Farming is not enabled in this server.`
            );
          }

          const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Farm`)
            .setColor("Green");

          const farmProfile = config.farming.find(
            (farm) => farm.uid === message.author.id
          );

          if (!farmProfile) {
            embed
              .setDescription(`You do not own any farm.`)
              .setFooter({
                text: `Tip: Server managers can create a farm for you!`,
              })
              .setColor("Red");
            return message.channel.send({ embeds: [embed] });
          }

          if (!farmProfile.enabled) {
            embed
              .setDescription(`Your farm has been disabled.`)
              .setColor("Red");
            return message.channel.send({ embeds: [embed] });
          }

          const farmDisplay =
            farmProfile.land
              .map((item, i) => {
                const itemData = config.shop.find(
                  (shopItem) => shopItem.uid === item.uid
                );
                if (!itemData) return null;
                return `${i + 1}. ${formatFarmItem(item, itemData)}`;
              })
              .filter(Boolean)
              .join("\n") || "🌱 No items have been planted.";

          embed.setDescription(farmDisplay);
          return message.channel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      if (error.code === 50013) return;
      require("../../utilities/debug").debug(
        this.name,
        message,
        process.env.OWNER_ID,
        error.stack
      );
      console.log(error);
    }
  },
};

function formatDuration(value, unit = "minutes") {
  if (isNaN(value) || value < 0) return "0s";

  // Convert to seconds if given in minutes
  let totalSeconds = unit === "minutes" ? value * 60 : value;

  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

// Helper function to format farm items
function formatFarmItem(item, itemData) {
  const now = new Date();
  const readyAt = new Date(item.ready);
  const isReady = now >= readyAt;

  return `${itemData.icon || "[Icon]"} ${
    itemData.name || "Unknown Item"
  } : Status: ${
    isReady
      ? "✅ Ready to collect"
      : `⏳ Growing (ready at ${readyAt.toLocaleString()})`
  }`;
}

function formatNumber(number) {
  return number.toLocaleString();
}

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType,
  ActivityType,
} = require("discord.js");
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Servers = require("./models/servers");
const Security = require("./models/securitySchema");
// bot.js
let state = new Map();

// ────────────────────────────────
// MongoDB Connection
// ────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
}
connectDB();

// ────────────────────────────────
// Client Setup
// ────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Reaction, Partials.Message],
});

// ────────────────────────────────
module.exports = { client, state };

// ────────────────────────────────
// Command Loader
// ────────────────────────────────
client.commands = new Map();
const commandsPath = path.join(__dirname, "/commands");

function loadCommands(folder) {
  const files = fs.readdirSync(folder);

  for (const file of files) {
    const fullPath = path.join(folder, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommands(fullPath); // recursive
    } else if (file.endsWith(".js")) {
      const command = require(fullPath);

      if (command.name) {
        // store main command
        client.commands.set(command.name.toLowerCase(), command);
        console.log(`✅ Loaded command: ${command.name}`);

        // store aliases
        if (Array.isArray(command.alias)) {
          for (const alias of command.alias) {
            client.commands.set(alias.toLowerCase(), command);
            console.log(`   ↳ Alias loaded: ${alias} → ${command.name}`);
          }
        }
      }
    }
  }
}
loadCommands(commandsPath);
console.log(`📦 Total commands loaded: ${client.commands.size}`);

client.once("clientReady", async () => {
  console.log(`🤖 Client is ready as ${client.user.tag}`);
  client.user.setActivity({
    type: ActivityType.Custom,
    name: "customstatus",
    state: "𐙚 S-E-M 𐙚",
  });

  state.set("maintenance", true);
});

const userMessageMap = new Map();

const link = require("./utilities/handlerLink");

client.on("messageCreate", async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const content = message.content.toLowerCase();

    const serverProfile = await Servers.findOne({ serverId: message.guild.id });

    link.execute(message);

    if (serverProfile.plugins.leveling.enabled) {
      const settings = serverProfile.plugins.leveling.settings;

      // Find or create user entry
      let userData = serverProfile.plugins.leveling.levelData.find(
        (m) => m.id === message.author.id
      );

      if (!userData) {
        userData = {
          id: message.author.id,
          level: 1,
          exp: 0,
          cooldown: 0,
        };
        serverProfile.plugins.leveling.levelData.push(userData);
      }

      // Cooldown check
      const now = Date.now();
      if (now - userData.cooldown > settings.cooldown * 1000) {
        // Calculate EXP gain
        let gainedExp = settings.baseExp;
        if (settings.lengthFactor) {
          const lengthBonus = Math.floor(message.content.length / 10);
          gainedExp += Math.min(lengthBonus, settings.maxExpPerMsg);
        }

        // Update EXP
        userData.exp += gainedExp;

        // Calculate required EXP using multiplier 1.5
        const requiredExp = Math.floor(100 * Math.pow(1.5, userData.level - 1));

        let levelUp = false;

        if (userData.exp >= requiredExp) {
          userData.level++;
          userData.exp = 0; // 🔹 reset EXP after level-up
          levelUp = true;
        }

        // Update cooldown
        userData.cooldown = now;
        await serverProfile.save();

        // Send level-up message
        if (levelUp) {
          const levelChannelId = serverProfile.plugins.leveling.channel;
          const levelChannel =
            message.guild.channels.cache.get(levelChannelId) || message.channel;
          const embed = new EmbedBuilder()
            .setDescription(
              `🎉 ${message.author} just leveled up to **Level ${userData.level}**!`
            )
            .setColor("Green");
          await levelChannel.send({
            embeds: [embed],
          });
        }
      }
    }

    const prefix = serverProfile?.prefix || process.env.PREFIX || "!";
    const {
      defaultCommandHelp,
      defaultCommandPrefix,
    } = require("./utilities/defaultCommands");

    // Determine which prefix is used
    const defaultPrefix = "!";
    let usedPrefix = null;

    if (content.startsWith(defaultPrefix)) usedPrefix = defaultPrefix;
    else if (content.startsWith(prefix)) usedPrefix = prefix;

    // If no prefix matched, ignore
    if (!usedPrefix) return;

    const botMember = message.guild.members.me;
    const botPermissions = message.channel.permissionsFor(botMember);

    // ❌ Stop if bot cannot send messages
    if (!botPermissions?.has("SendMessages")) {
      console.log(
        `❌ Bot cannot send messages in ${message.channel.name} (Guild: ${message.guild.name})`
      );
      return;
    }

    // Parse command arguments
    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // Handle default commands first
    let handledDefaultCommand = false;

    if (commandName === "prefix") {
      await defaultCommandPrefix(message, args, client);
      handledDefaultCommand = true;
    }

    if (commandName === "help") {
      await defaultCommandHelp(message, args, client);
      handledDefaultCommand = true;
    }

    // Handle custom commands if not a default command
    if (!handledDefaultCommand) {
      const command = client.commands.get(commandName);
      if (command) {
        try {
          await command.execute(message, args, client);
        } catch (error) {
          console.error("Command execution error:", error);
          if (error.code === 50013) return; // missing permission
        }
      }
    }
    if (serverProfile.premium.isEnable) {
      if (serverProfile?.antiSpam?.isEnable) {
        const { maxMessages, interval, action, duplicateCheck, maxMentions } =
          serverProfile.antiSpam;

        const userId = message.author.id;
        const now = Date.now();

        if (!userMessageMap.has(userId)) {
          userMessageMap.set(userId, []);
        }

        const userData = userMessageMap.get(userId);

        // Track messages
        userData.push({ content: message.content, timestamp: now });

        // Keep only messages in interval
        const recent = userData.filter((m) => now - m.timestamp < interval);
        userMessageMap.set(userId, recent);

        // Rule 1: Too many messages
        if (
          recent.length >= maxMessages &&
          !message.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          punish(message, action);
        }

        // Rule 2: Duplicate spam
        if (
          duplicateCheck &&
          recent.length >= 3 &&
          recent.every((m) => m.content === recent[0].content) &&
          !message.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          punish(message, action);
        }

        // Rule 3: Mass mentions
        const mentionCount =
          message.mentions.users.size + message.mentions.roles.size;
        if (
          mentionCount >= maxMentions &&
          !message.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          punish(message, action);
        }

        // Punishment handler
        async function punish(message, action) {
          switch (action) {
            case "warn":
              serverProfile.warnings.members.push({
                userId: userId,
                moderatorId: client.user.id,
                reason: "Spamming is not allowed in the server.",
              });
              const memberWarnings = serverProfile.warnings.members.filter(
                (member) => member.userId === userId
              );

              await serverProfile.save();

              // trigger if reach maximum warnings
              if (memberWarnings.length >= serverProfile.warnings.maxWarnings) {
                const { execute } = require("./utilities/punishment");
                await execute(
                  message,
                  serverProfile.warnings.action,
                  client.user,
                  message.member,
                  null,
                  "Spamming is not allowed."
                );
              }
              break;
            case "kick":
              await message.member.kick("Spamming messages");
              break;
            case "ban":
              await message.member.ban({ reason: "Spamming messages" });
              break;
            case "mute":
              await message.member.timeout(10 * 60 * 1000, "Spam detected"); // 10 min mute
              break;
          }
        }
      }

      if (serverProfile.wordguard.isEnable) {
        // Skip if sender is administrator
        if (!message.member.permissions.has("Administrator")) {
          const content = message.content.toLowerCase();
          const matchedWord = serverProfile.wordguard.blacklist.find((word) =>
            content.includes(word.toLowerCase())
          );
          if (matchedWord) {
            const reason = `Used blacklisted word "${matchedWord}" in #${message.channel.name} on server "${message.guild.name}"`;
            require("./utilities/punishment").execute(
              message,
              serverProfile.wordguard.action,
              client.user,
              message.member,
              null,
              reason
            );
            await message.delete().catch(() => {});
            console.log(`Word contained blacklist word`);
          }
        }
      }
    }
  } catch (err) {
    if (err.code === 50013) return;
  }
});

client.on("inviteCreate", async (invite) => {
  try {
    const guild = invite.guild;

    // Log some info
    console.log(`New invite created in ${guild.name} by ${invite.inviter.tag}`);
    console.log(`Invite code: ${invite.code}`);
    console.log(`Max uses: ${invite.maxUses}`);
    console.log(`Temporary: ${invite.temporary}`);

    // Example: check security settings
    const securityProfile = await Security.findOne({ serverId: guild.id });
    if (securityProfile?.antiInviteCreate) {
      // delete invite if needed
      await invite.delete().catch(() => {});
      console.log(`Deleted invite ${invite.code} due to anti-invite policy`);
    }
  } catch (err) {
    console.error(err);
  }
});

client.on("channelCreate", async (channel) => {
  try {
    const securityProfile = await Security.findOne({
      serverId: channel.guild.id,
    });

    if (!securityProfile) return;
    if (!securityProfile.antiChannelCreate) return;

    // Fetch audit logs (Channel Create = type 10)
    const logs = await channel.guild.fetchAuditLogs({
      type: 10,
      limit: 1,
    });

    const entry = logs.entries.first();
    if (!entry) return;

    const executor = entry.executor; // user/bot who created the channel

    // Skip if main bot created it
    if (executor.id === client.user.id) return;

    // Whitelist check: bypass if executor is in whitelist
    const whitelist = securityProfile.whitelist || []; // array of objects like { id: "123" }

    if (whitelist.some((user) => user.id === executor.id)) {
      return; // executor IS whitelisted → skip protection
    }

    // Delete channel if created by another bot
    if (executor.bot) {
      try {
        await channel.delete().catch(() => {});
        console.log(`Deleted channel created by bot: ${executor.tag}`);

        // Kick the bot if possible
        const member = channel.guild.members.cache.get(executor.id);
        if (member && member.kickable) {
          await member.kick("Bot created unauthorized channel");
          console.log(`Kicked bot: ${executor.tag}`);
        }
      } catch (err) {
        console.error(`Failed to delete/kick bot: ${err.message}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
});

client.on("channelDelete", async (channel) => {});

const TempVoice = require("./models/tempvoice");

client.on("voiceStateUpdate", async (oldState, newState) => {
  const user = newState.member;
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  // Load temp voice profile
  const tempVoiceProfile = await TempVoice.findOne({ serverId: user.guild.id });
  if (!tempVoiceProfile || !tempVoiceProfile.panel) return;

  // User JOINED VC
  if (!oldChannel && newChannel) {
    try {
      const tempVoiceChannel = tempVoiceProfile.panel.find(
        (p) => p.panelChannel === newChannel.id
      );
      if (!tempVoiceChannel) return;
      // Create private voice channel
      const newPrivateChannel = await newState.guild.channels.create({
        name: `${tempVoiceChannel.customName || `${user.user.username}'s VC`}`,
        type: 2, // voice
        parent: tempVoiceChannel.categoryChannel || null,
        permissionOverwrites: [
          {
            id: user.id,
            allow: ["Connect", "Speak", "MuteMembers", "DeafenMembers"],
          },
          {
            id: newState.guild.roles.everyone.id,
            deny: ["Connect"],
          },
        ],
      });

      // Move user into private channel
      await user.voice.setChannel(newPrivateChannel);

      console.log(`[TempVoice] ${user.user.tag} joined: ${newChannel.name}`);
    } catch (error) {
      console.error(error);
    }
  }

  // User LEFT VC
  else if (oldChannel && !newChannel) {
    try {
      const parent = oldChannel.parent;
      if (!parent) return;
      const tempVoiceChannel = tempVoiceProfile.panel.find(
        (p) => p.categoryChannel === oldChannel.parent.id
      );
      if (!tempVoiceChannel) return;

      // check if the left is tempvoice channel
      if (tempVoiceChannel.panelChannel === oldChannel.id) return;

      // Delete only if the channel is empty
      if (oldChannel.members.size === 0) {
        await oldChannel.delete().catch(() => {});
      }
    } catch (error) {
      console.error(error);
    }
  }

  // User MOVED VC
  else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    try {
      console.log(
        `${user.user.tag} moved: ${oldChannel.name} → ${newChannel.name}`
      );

      // Check if NEW channel is a TempVoice panel channel
      const panelData = tempVoiceProfile.panel.find(
        (p) => p.panelChannel === newChannel.id
      );

      // 1️⃣ User MOVED INTO PANEL → Create NEW private VC
      if (panelData) {
        const newPrivateVC = await newChannel.guild.channels.create({
          name: `${user.user.username}'s VC`,
          type: 2,
          parent: panelData.categoryChannel,
          permissionOverwrites: [
            {
              id: user.id,
              allow: ["Connect", "Speak"],
            },
            {
              id: newChannel.guild.roles.everyone.id,
              deny: ["Connect"],
            },
          ],
        });

        // Move user into newly created voice channel
        await user.voice.setChannel(newPrivateVC);
      }
      // Don't delete if it's the panel channel
      const panelInfo = tempVoiceProfile.panel.find(
        (p) => p.panelChannel === oldChannel.id
      );
      if (panelInfo) return; // panel cannot be deleted

      if (oldChannel.members.size === 0) {
        await oldChannel.delete().catch(() => {});
        console.log(`Deleted empty temp voice: ${oldChannel.name}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
});

// When a new member joins
client.on("guildMemberAdd", async (member) => {
  try {
    // execute greeting and farewell
    await require("./utilities/handlerGreeting").execute(member);
    // execute nameguard
    await require("./utilities/handlerNameguard").execute(member);

    const serverProfile = await Servers.findOne({ serverId: member.guild.id });

    // apply nameguard
    if (serverProfile) {
      // execute the invite tracker
      if (serverProfile.inviteTracker.isEnable) {
        const currentInvites = await member.guild.invites.fetch();
        // Loop through all invites
        currentInvites.forEach((invite, code) => {
          console.log("Invite code:", code); // '5NYeaQFb'
          console.log("Invite uses:", invite.uses); // 3
          console.log("Inviter:", invite.inviter?.tag);
        });

        const invitesData = currentInvites.map((i) => ({
          code: i.code,
          uses: i.uses,
        }));

        serverProfile.inviteTracker.invites = invitesData;
        await serverProfile.save();

        const inviteData = serverProfile.inviteTracker.invites || [];

        // Convert Collection to array for easier comparison
        const currentArray = Array.from(currentInvites.values());

        // Find the invite that increased in uses
        const usedInvite = currentArray.find((i) => {
          const stored = inviteData.find((inv) => inv.code === i.code);
          return stored ? true : false;
        });

        let description = "";

        if (usedInvite) {
          description = `**${member.user.tag}** has been invited by **${usedInvite.inviter.tag}**. They now has **${usedInvite.uses}** invites.`;

          // Update DB
          const index = inviteData.findIndex(
            (inv) => inv.code === usedInvite.code
          );
          if (index !== -1) inviteData[index].uses = usedInvite.uses;
          else
            inviteData.push({ code: usedInvite.code, uses: usedInvite.uses });
          serverProfile.inviteTracker.invites = inviteData;
          await serverProfile.save();
        }
        // Case 2: Vanity URL
        else if (member.guild.vanityURLCode) {
          description = `**${member.user.tag}** joined using the server's vanity URL!`;
        }
        // Case 3: Unknown invite
        else {
          description = `I couldn't determined how **${member.user.tag}** joined the server.`;
        }

        // Send to log channel
        const logChannelId = serverProfile.inviteTracker.channelId;
        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          logChannel.send(description);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error Execute Commands: ", err);
  }
});

// handler leave member
client.on("guildMemberRemove", async (member) => {
  // Trigger when a member leaves
  console.log(`${member.user.tag} left ${member.guild.name}`);
  await require("./utilities/handlerFarewell").execute(member);
});

// handle trigger edit messages
client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (newMessage.author.bot) return;

  // Regex to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  if (urlRegex.test(newMessage.content)) {
    link.execute(newMessage);
  }
  // Log the edit
  if (oldMessage.content === newMessage.content) return; // No actual change
  console.log(
    `Message edited from: "${oldMessage.content}" to: "${newMessage.content}"`
  );
});

// handle member actions
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    // execute nameguard
    if (oldMember.nickname !== newMember.nickname) {
      require("./utilities/handlerNameguard").execute(newMember);
    }
  } catch (error) {
    if (error.code === 50013) return;
    console.error(error);
  }
});

// ✅ Global username changes (outside servers)
client.on("userUpdate", async (oldUser, newUser) => {
  if (oldUser.globalName !== newUser.globalName) {
    for (const [guildId, guild] of client.guilds.cache) {
      const member = await guild.members.fetch(newUser.id).catch(() => null);
      if (!member) continue;

      // Call your function per guild
      require("./utilities/handlerNameguard").execute(member);
    }
  }
});

const blacklistGuild = require("./models/blacklist");
// trigger bot on invite
client.on("guildCreate", async (guild) => {
  try {
    const data = await blacklistGuild.findOne({});
    if (data && data.blacklist.includes(guild.id)) {
      return await guild.leave();
    }
    // console.log(`✅ Joined new server: ${guild.name} (ID: ${guild.id})`);
    let serverProfile = await Servers.findOne({ serverId: guild.id });

    if (!serverProfile) {
      serverProfile = new Servers({
        serverId: guild.id,
      });
      await serverProfile.save();
      console.log(`created data for ${guild.id}`);
    }

    // DM the server owner
    try {
      const owner = await guild.fetchOwner();
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setThumbnail(client.user.displayAvatarURL())
        .setTitle(`Dear **${owner.user.tag}**. Thanks for using Beetle.`)
        .addFields(
          {
            name: `About Me`,
            value: `I am a multipurpose Discord bot designed to help you safeguard and manage your server with ease. My powerful features include moderation tools, automation, spam protection, and bad word filtering, ensuring a safe and friendly environment for your community. I also help maintain clean and appropriate usernames, provide an engaging economy system for fun and interaction, and offer many more utilities to enhance your Discord experience. With me, your server stays protected, organized, and lively—all in one bot!`,
          },
          {
            name: `Addictional Link`,
            value: `Support Server : https://discord.gg/cvhdutpc9m\nDashboard : https://beetle.click/dashboard\nTerms & Privacy : https://beetle.click/terms-of-service`,
          }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(`Sent from ${guild.name}`)
          .setDisabled(true)
          .setStyle(ButtonStyle.Primary)
          .setCustomId("sent_button")
      );
      await owner.send({ embeds: [embed], components: [row] });
      console.log(`📩 Sent DM to server owner: ${owner.user.tag}`);
    } catch (error) {
      console.error(error);
      console.log(
        `⚠️ Couldn't DM the owner of ${guild.name}. DMs might be disabled.`
      );
    }
  } catch (error) {
    console.error("Error handling guildCreate:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    console.log(interaction.customId);

    if (interaction.customId.startsWith("join_giveaway_")) {
      require("./utilities/handlerGiveaway").execute(interaction);
      return;
    }

    if (interaction.customId.startsWith("lottery_")) {
      // if interaction is currency lottery
      require("./utilities/handlerLottery").execute(interaction);
      return;
    }

    if (interaction.customId === "verification") {
      require("./utilities/handlerVerification").execute(interaction);
    }

    try {
      const serverProfile = await Servers.findOne({
        serverId: interaction.guild.id,
      });
      if (!serverProfile) return;

      const ticketChannel = interaction.channel;
      const [action, , ticketId] = interaction.customId.split("_"); // e.g., claim_ticket_1234 or close_ticket_1234

      // CLAIM TICKET
      if (action === "claim") {
        const allowedRoles = serverProfile.tickets.claimRoles || [];
        if (
          !interaction.member.roles.cache.some((r) =>
            allowedRoles.includes(r.id)
          )
        ) {
          return interaction.reply({
            content: "❌ You are not authorized to claim tickets.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.reply({
          content: "Claiming ticket...",
          flags: MessageFlags.Ephemeral,
        });

        const updated = await Servers.findOneAndUpdate(
          {
            serverId: interaction.guild.id,
            "tickets.users": {
              $elemMatch: {
                ticketId,
                claimBy: null, // ensure nobody claimed it yet
                status: { $nin: ["active", "closed"] }, // cannot claim active or closed tickets
              },
            },
          },
          {
            $set: {
              "tickets.users.$.claimBy": interaction.user.id,
              "tickets.users.$.status": "active",
            },
          },
          { new: true }
        );

        if (!updated) {
          return interaction.editReply({
            content: "⚠️ This ticket has already been claimed or is closed.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await ticketChannel.permissionOverwrites.edit(interaction.user.id, {
          SendMessages: true,
        });

        // Move ticket into active category
        const activeTicketCategoryId =
          serverProfile.tickets.activeTicketCategory;
        if (activeTicketCategoryId) {
          const activeCategory = interaction.guild.channels.cache.get(
            activeTicketCategoryId
          );
          if (
            activeCategory &&
            activeCategory.type === ChannelType.GuildCategory
          ) {
            await ticketChannel.setParent(activeCategory.id).catch(() => {});
          }
        }

        await interaction.editReply({
          content: "✅ You have successfully claimed this ticket.",
          flags: MessageFlags.Ephemeral,
        });

        await ticketChannel.send(
          `👤 ${interaction.user} has claimed this ticket.`
        );
        return;
      }

      // CLOSE TICKET
      if (action === "close") {
        // Fetch ticket data
        const serverProfile = await Servers.findOne({
          serverId: interaction.guild.id,
          "tickets.users.ticketId": ticketId,
        });
        if (!serverProfile) {
          return interaction.reply({
            content: "⚠️ Ticket not found in the database.",
            ephemeral: true,
          });
        }

        const ticketData = serverProfile.tickets.users.find(
          (t) => t.ticketId === ticketId
        );

        // ✅ Check if already closed
        if (ticketData?.status === "closed") {
          return interaction.reply({
            content: "⚠️ This ticket is already closed.",
            ephemeral: true,
          });
        }

        // ✅ Permission check: only claimer, creator, or admins
        if (
          ticketData?.claimBy !== interaction.user.id &&
          ticketData?.createdBy !== interaction.user.id &&
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return interaction.reply({
            content: "❌ You don’t have permission to close this ticket.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content: "Closing ticket...",
          flags: MessageFlags.Ephemeral,
        });

        const updated = await Servers.findOneAndUpdate(
          {
            serverId: interaction.guild.id,
            "tickets.users.ticketId": ticketId,
          },
          {
            $set: {
              "tickets.users.$.status": "closed",
              "tickets.users.$.closedAt": new Date(),
            },
          },
          { new: true }
        );

        if (!updated) {
          return interaction.editReply({
            content: "⚠️ Ticket not found in the database.",
            ephemeral: true,
          });
        }

        // Rename channel
        await ticketChannel
          .setName(`closed-ticket-${ticketId}`)
          .catch(() => {});

        // Move to closed category if exists
        const closedCategoryId = serverProfile.tickets.closedTicketCategory;
        if (closedCategoryId) {
          const closedCategory =
            interaction.guild.channels.cache.get(closedCategoryId);
          if (closedCategory && closedCategory.type === 4) {
            await ticketChannel.setParent(closedCategoryId).catch(() => {});
          }
        }

        // Deny SendMessages for the ticket creator
        if (ticketData?.createdBy) {
          await ticketChannel.permissionOverwrites.edit(ticketData.createdBy, {
            ViewChannel: true,
            SendMessages: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
          });
        }

        // Deny SendMessages for all claim roles
        if (serverProfile.tickets.claimRoles?.length) {
          for (const roleId of serverProfile.tickets.claimRoles) {
            await ticketChannel.permissionOverwrites
              .edit(roleId, {
                SendMessages: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
              })
              .catch(() => {});
          }
        }

        await interaction.editReply({
          content: "✅ Ticket has been closed.",
          flags: MessageFlags.Ephemeral,
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`transcript_ticket_${ticketId}`)
            .setLabel("Transcript")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`delete_ticket_${ticketId}`)
            .setStyle(ButtonStyle.Danger)
            .setLabel("Delete Ticket")
        );

        await ticketChannel.send({
          content: `🔒 Ticket has been closed by <@${interaction.user.id}>`,
          components: [row],
        });
        return;
      }

      if (action === "delete") {
        try {
          console.log(ticketId);
          // Fetch ticket data
          const serverProfile = await Servers.findOne({
            serverId: interaction.guild.id,
            "tickets.users.ticketId": ticketId,
          });
          if (!serverProfile) {
            return interaction.reply({
              content: "⚠️ Ticket not found in the database.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const ticketData = serverProfile.tickets.users.find(
            (t) => t.ticketId === ticketId
          );

          // Ensure only claimer OR admin can delete
          const isClaimer = ticketData.claimBy === interaction.user.id;
          const isAdmin = interaction.member.permissions.has("Administrator");

          if (!isClaimer && !isAdmin) {
            return interaction.reply({
              content:
                "❌ Only the staff member who claimed this ticket **or** an Administrator can delete it.",
              flags: MessageFlags.Ephemeral,
            });
          }

          await interaction.reply({
            content: "🗑️ Ticket will be deleted in a moments..",
          });

          setTimeout(async () => {
            try {
              // Remove ticket from DB
              await Servers.updateOne(
                { serverId: interaction.guild.id },
                { $pull: { "tickets.users": { ticketId } } }
              );

              // Delete the channel
              await ticketChannel
                .delete(`Ticket ${ticketId} deleted by ${interaction.user.tag}`)
                .catch(() => {}); // use catch to handle mutiple delete
            } catch (err) {
              console.error("Error deleting ticket:", err);
            }
          }, 4000);
          return;
        } catch (error) {
          console.error(error);
        }
      }

      const discordTranscripts = require("discord-html-transcripts");

      if (action === "transcript") {
        try {
          // Fetch ticket data
          const serverProfile = await Servers.findOne({
            serverId: interaction.guild.id,
            "tickets.users.ticketId": ticketId,
          });
          if (!serverProfile) {
            return interaction.reply({
              content: "⚠️ Ticket not found in the database.",
              ephemeral: true,
            });
          }
          if (!serverProfile.premium.isEnable) {
            return interaction.reply({
              content: `${process.env.PREMIUM} Upgrade your server into the Premium to unlock this command and more benefit`,
              flags: MessageFlags.Ephemeral,
            });
          }

          const ticketData = serverProfile.tickets.users.find(
            (t) => t.ticketId === ticketId
          );
          if (!ticketData) {
            return interaction.reply({
              content: "⚠️ Ticket not found.",
              ephemeral: true,
            });
          }

          // Permission check: must be claimer or admin
          const isClaimer = ticketData.claimBy === interaction.user.id;
          const isAdmin = interaction.member.permissions.has("Administrator");

          if (!isClaimer && !isAdmin) {
            return interaction.reply({
              content:
                "❌ Only the staff member who claimed this ticket or an Administrator can generate transcripts.",
              ephemeral: true,
            });
          }

          await interaction.reply({
            content: "📄 Generating transcript...",
            flags: MessageFlags.Ephemeral,
          });

          // Generate transcript
          const transcript = await discordTranscripts.createTranscript(
            ticketChannel,
            {
              limit: -1, // fetch all messages
              returnBuffer: false,
              filename: `transcript-ticket-${ticketId}.html`,
              footerText: `powered by Beetle`,
              poweredBy: false,
            }
          );

          // Send transcript to claimer/admin
          await interaction.user
            .send({
              content: `📑 Here is the transcript for ticket **#${ticketId}**`,
              files: [transcript],
            })
            .catch(() => {
              ticketChannel.send({
                content: `📑 Transcript for ticket **#${ticketId}**`,
                files: [transcript],
              });
            });

          // Optionally: send transcript to transcript channel
          const transcriptChannelId = serverProfile.tickets.transcriptChannel;
          if (transcriptChannelId) {
            const transcriptChannel =
              interaction.guild.channels.cache.get(transcriptChannelId);
            if (transcriptChannel) {
              await transcriptChannel.send({
                content: `🗂 Transcript for ticket **#${ticketId}**`,
                files: [transcript],
              });
            }
          }

          await interaction.editReply({
            content: "✅ Transcript has been generated and sent.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        } catch (error) {
          console.error("Transcript generation error:", error);
          if (!interaction.replied) {
            await interaction.reply({
              content: "❌ Failed to generate transcript.",
              ephemeral: true,
            });
          }
        }
      }

      // Other ticket actions
      require("./utilities/ticketHandler").execute(interaction);
    } catch (err) {
      console.error("Ticket interaction error:", err);
    }
  } catch (error) {
    console.error("Interaction handling error:", error);
  }
});

client.login(process.env.DISCORD_TOKEN);

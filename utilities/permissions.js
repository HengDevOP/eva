const {
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const servers = require("../models/servers");
require("dotenv").config();
const icon = process.env.ICON;
const check = process.env.CHECK;
const uncheck = process.env.UNCHECK;
const premium = process.env.PREMIUM;

const maintenance = new Set();

function memberPermissions(message) {
  const hasPermissions = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
  if (!hasPermissions) return false;
  return true;
}

async function premiumPermission(message) {
  try {
    const serverData = await servers.findOne({ serverId: message.guild.id });

    if (serverData?.premium?.isEnable) {
      return true;
    }

    const embed = new EmbedBuilder()
      .setDescription(`${premium} Upgrade your server to access this feature.`)
      .setColor("Gold");

    await message.channel.send({ embeds: [embed] });
    return false;
  } catch (error) {
    console.error("Premium check error:", error);
    return false;
  }
}

function botPermissions(message, requiredPermissions) {
  const botMember = message.guild.members.me;
  const missingPermissions = requiredPermissions.filter(
    (perm) => !botMember.permissions.has(PermissionsBitField.Flags[perm])
  );

  if (missingPermissions.length) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription(
        `${icon} Oops! I am missing **${missingPermissions.join(
          ", "
        )}** permissions to execute this command.`
      );
    message.reply({ embeds: [embed] });
    return false;
  }
  return true;
}

async function checkPremium(serverProfile) {
  const now = Date.now();

  // Check premium
  if (serverProfile.premium.isEnable) {
    if (
      !serverProfile.premium.expiresAt ||
      now < serverProfile.premium.expiresAt.getTime()
    ) {
      return "premium"; // active premium
    } else {
      // premium expired
      serverProfile.premium.isEnable = false;
      serverProfile.premium.expiresAt = null;
      await serverProfile.save();
    }
  }

  // Check trial
  if (serverProfile.trial.isEnable) {
    if (
      serverProfile.trial.expiresAt &&
      now < serverProfile.trial.expiresAt.getTime()
    ) {
      return "trial"; // active trial
    } else {
      // trial expired
      serverProfile.trial.isEnable = false;
      serverProfile.trial.expiresAt = null;
      await serverProfile.save();
    }
  }

  return false; // neither premium nor trial
}

async function moderationLog(message, action, moderator, target, ts, reason) {
  try {
    const serverProfile = await servers.findOne({ serverId: message.guild.id });
    if (!serverProfile) return;
    if (action !== "Test Action" && !serverProfile.modLogs.isEnable) return;

    const logChannelId = serverProfile.modLogs.channelId;
    if (!logChannelId) return;

    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    serverProfile.modLogs.cases += 1;
    await serverProfile.save();

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle(`${action} | Case #${serverProfile.modLogs.cases}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `User ID: ${target.id}` })
      .setTimestamp();

    switch (action) {
      case "Ban":
        embed.addFields(
          { name: "Target Member", value: `${target.username} (${target.id})` },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          { name: "Ban Duration", value: "Permanently" },
          { name: "Reason", value: reason || "No reason provided" }
        );
        break;

      case "Unban":
        embed.addFields(
          { name: "Target Member", value: `${target.username} (${target.id})` },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          { name: "Reason", value: reason || "No reason provided" }
        );
        break;

      case "Kick":
        embed.addFields(
          { name: "Target Member", value: `${target.username} (${target.id})` },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          { name: "Reason", value: reason || "No reason provided" }
        );
        break;

      case "Mute":
        embed.addFields(
          { name: "Target Member", value: `${target.username} (${target.id})` },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          {
            name: "Mute Duration",
            value: ts
              ? `<t:${Math.floor((Date.now() + ts) / 1000)}:R>`
              : "Permanent",
          },
          { name: "Reason", value: reason || "No reason provided" }
        );
        break;

      case "Unmute":
        embed.addFields(
          { name: "Target Member", value: `${target.username} (${target.id})` },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          { name: "Reason", value: reason || "No reason provided" }
        );
        break;
      case "Warn":
        embed.addFields(
          {
            name: "Target Member",
            value: `${target.username} (${target.id})`,
          },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          { name: "Reason", value: reason || "No reason provided" }
        );
        break;
      default:
        embed.addFields(
          { name: "Target Member", value: `${target.username} (${target.id})` },
          {
            name: "Responsible Moderator",
            value: `${moderator.username} (${moderator.id})`,
          },
          {
            name: "Action Time Left",
            value: ts
              ? `<t:${Math.floor((Date.now() + ts) / 1000)}:R>`
              : "Unknown",
          },
          { name: "Reason", value: reason || "No reason provided" }
        );
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error in moderationLog:", error);
  }
}

async function checkServerProfile(message) {
  try {
    let serverProfile = await servers.findOne({ serverId: message.guild.id });
    if (!serverProfile) {
      const embed = new EmbedBuilder()
        .setTitle(`Required Server Setup`)
        .setDescription(`You need to set up your server`);
      await message.reply({ embeds: [embed] });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error fetching server profile:", error);
  }
}

async function checkCurrencyAccount(data, message) {
  const isData = data.currency.members.find((m) => m.id === message.member.id);
  if (!isData) {
    message.channel.send(
      `${uncheck} ${message.author}, you do not have currency account.`
    );
    return false;
  }
  return true;
}

async function handlerSetup(message) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(`Required Setup`)
      .setDescription(
        `You need to set up the server first.\nLearn how to set up your server [here](https://beetle.click/dashboard)`
      );
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function premiumAccess(message) {
  const serverProfile = await servers.findOne({ serverId: message.guild.id });
  if (!serverProfile) return false;

  const premium = serverProfile.premium;
  const now = new Date();

  // ✅ Check if premium exists and is not expired
  if (premium && premium.expiresAt && new Date(premium.expiresAt) > now) {
    return true; // Premium is still valid
  }

  // ❌ Premium is missing or expired
  const isAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  if (isAdmin) {
    let description;

    if (premium?.expiresAt) {
      description = `⚠️ Your **Premium Plan** expired on **${new Date(
        premium.expiresAt
      ).toDateString()}**.\nPlease renew to continue enjoying premium features.`;
    } else {
      description = `${process.env.PREMIUM} This feature is available for **Premium Servers** only.`;
    }

    const embed = new EmbedBuilder()
      .setTitle("Premium Access Required")
      .setColor(premium?.expiresAt ? "Red" : "Yellow")
      .setDescription(description);

    await message.channel.send({ embeds: [embed] });
  }

  return false;
}

function convertEmoji(emoji) {
  if (!emoji || typeof emoji !== "string") return emoji;

  // If already wrapped in <>
  if (emoji.startsWith("<") && emoji.endsWith(">")) return emoji;

  // Trim spaces and wrap
  return `<${emoji.trim()}>`;
}

const { state } = require("../bot");

async function checkMaintenance(
  message,
  maintenanceIcon = process.env.maintenanceIcon
) {
  const ownerId = process.env.OWNER_ID;

  // ✅ Allow owner to bypass maintenance
  if (message.author.id === ownerId) return false;

  // Use state Map to check maintenance
  if (state.get("maintenance")) {
    const embed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setDescription(
        `${maintenanceIcon} *The bot is currently undergoing a short maintenance break.*`
      );

    await message.channel.send({ embeds: [embed] });
    return true; // Maintenance active — stop command
  }

  return false; // Not under maintenance — continue
}

async function rateLimited(message) {
  const userId = message.author.id;

  // Get or create rateLimit map from state
  let rateMap = state.get("ratelimit");
  if (!rateMap) {
    rateMap = new Map();
    state.set("ratelimit", rateMap);
  }

  const now = Date.now();
  const cooldown = 2000; // 2 seconds between messages
  const maxAttempts = 5; // max quick attempts
  const retryAfterMs = 5 * 60 * 1000; // 5 minutes block

  // Get or initialize user data
  let userData = rateMap.get(userId);
  if (!userData) {
    userData = { timestamps: [], blockedUntil: null, notified: false };
    rateMap.set(userId, userData);
  }

  // Check if user is currently blocked
  if (userData.blockedUntil) {
    if (now < userData.blockedUntil) {
      // Only send message once
      if (!userData.notified) {
        const remaining = Math.ceil((userData.blockedUntil - now) / 1000);
        await message.reply(
          `⏳ You are temporarily blocked. Retry after ${remaining} seconds.`
        );
        userData.notified = true;
        rateMap.set(userId, userData);
      }
      return true; // block action
    } else {
      // Retry period passed → reset attempts
      userData.blockedUntil = null;
      userData.timestamps = [];
      userData.notified = false;
      rateMap.set(userId, userData);
    }
  }

  // Filter timestamps within cooldown
  userData.timestamps = userData.timestamps.filter((t) => now - t < cooldown);

  // Add current attempt
  userData.timestamps.push(now);

  // Check if user exceeded maxAttempts
  if (userData.timestamps.length >= maxAttempts) {
    userData.blockedUntil = now + retryAfterMs;
    userData.timestamps = []; // reset attempts
    userData.notified = false; // will trigger message on first blocked attempt
    await message.reply(
      `⚠️ You sent too many messages too quickly! You are now blocked for 5 minutes.`
    );
    rateMap.set(userId, userData);
    return true; // block action
  }

  // Update map
  rateMap.set(userId, userData);

  // Optional cleanup
  setTimeout(() => {
    const user = rateMap.get(userId);
    if (user && !user.blockedUntil) {
      user.timestamps = user.timestamps.filter((t) => now - t < cooldown);
      if (user.timestamps.length === 0) rateMap.delete(userId);
    }
  }, cooldown + 1000);

  return false; // allowed
}

async function checkPlugin(message, plugin) {
  const serverProfile = await servers.findOne({ serverId: message.guild.id });
  if (!serverProfile) return false;

  // Check if the plugin is enabled
  if (!serverProfile.plugins[plugin]?.enabled) {
    // ✅ Only send the message if the user has Administrator permission
    if (message.member.permissions.has("Administrator")) {
      const embed = new EmbedBuilder()
        .setTitle("Plugin Access Denied")
        .setDescription(
          `⚠️ The **${plugin}** plugin is currently **disabled** for this server.`
        )
        .setColor("Red");

      // Send privately (only to the admin)
      await message.channel.send({ embeds: [embed] });
    }

    return false;
  }

  return true;
}

module.exports = {
  memberPermissions,
  botPermissions,
  checkServerProfile,
  moderationLog,
  checkPremium,
  checkCurrencyAccount,
  premiumPermission,
  handlerSetup,
  premiumAccess,
  convertEmoji,
  checkMaintenance,
  checkPlugin,
  rateLimited,
};

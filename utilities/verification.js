const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Server = require("../models/servers"); // adjust path

async function execute(message, targetMember, targetRole) {
  try {
    // Ensure we have a GuildMember, not just a User
    if (typeof targetMember === "string") {
      targetMember = await message.guild.members.fetch(targetMember);
    }

    if (!targetMember) {
      return message.reply("❌ Couldn't find the member.");
    }

    if (!targetRole) {
      return message.reply("❌ Couldn't find the role.");
    }

    // Check bot's highest role
    const botHighestRole = message.guild.members.me.roles.highest;
    if (targetRole.position >= botHighestRole.position) return;

    await targetMember.roles.add(targetRole);
  } catch (error) {
    console.error(error);
    return message.reply("❌ Something went wrong while assigning the role.");
  }
}

async function restoreAllVerifications(client) {
  try {
    const servers = await Server.find({
      "verification.channelId": { $exists: true },
      "verification.messageId": { $exists: true },
    });

    for (const serverProfile of servers) {
      try {
        // Fetch guild
        const guild = await client.guilds
          .fetch(serverProfile.serverId)
          .catch((err) => {
            console.error(
              `❌ Could not fetch guild ${serverProfile.serverId}:`,
              err
            );
            return null;
          });
        if (!guild) continue;

        // Fetch verification channel
        const channel = await guild.channels
          .fetch(serverProfile.verification.channelId)
          .catch((err) => {
            console.error(
              `❌ Could not fetch channel ${serverProfile.verification.channelId} in guild ${guild.id}:`,
              err
            );
            return null;
          });

        // Skip if channel doesn't exist
        if (!channel) {
          console.log(
            `⚠️ Verification channel not found for guild ${guild.id}. Skipping message fetch.`
          );
          continue; // do not attempt to fetch messages if channel is null
        }

        // Fetch verification message
        let message;
        try {
          message = await channel.messages.fetch(
            serverProfile.verification.messageId
          );
          if (!message) {
            console.log(
              `⚠️ Verification message ${serverProfile.verification.messageId} not found in channel ${channel.id}. Skipping...`
            );
            continue; // skip this serverProfile
          }
        } catch (err) {
          console.error(
            `❌ Failed to fetch verification message ${serverProfile.verification.messageId} in channel ${channel.id}:`,
            err
          );
          continue; // skip this serverProfile
        }

        console.log(
          `✅ Restored verification message ID: ${message.id} in guild ${guild.id}`
        );

        // Create a collector for verification button
        const collector = message.createMessageComponentCollector({});
        collector.on("collect", async (interaction) => {
          try {
            if (interaction.customId === "verification_button") {
              await execute(
                interaction,
                interaction.user.id,
                serverProfile.verification.role
              );
            }
            await interaction.deferUpdate();
          } catch (err) {
            console.error(
              `❌ Error handling interaction in guild ${guild.id}:`,
              err
            );
          }
        });
      } catch (err) {
        console.error(
          `❌ Error processing server profile ${serverProfile.serverId}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("❌ Failed to restore verifications for all servers:", err);
  }
}

module.exports = { restoreAllVerifications, execute };

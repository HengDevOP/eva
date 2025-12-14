const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const Server = require("../models/servers");
const { moderationLog } = require("../utilities/permissions");

module.exports = {
  async execute(message, action, moderator, target, ts, reason) {
    try {
      const serverProfile = await Server.findOne({
        serverId: message.guild.id,
      });

      if (!serverProfile) return;

      switch (action.toLowerCase()) {
        case "warn": {
          try {
            const WARN_LIMIT = serverProfile.warnings.maxWarnings || 3;

            // Initialize warnings array if not exists
            if (!serverProfile.warnings.members)
              serverProfile.warnings.members = [];

            // Add warning to DB
            serverProfile.warnings.members.push({
              userId: target.id,
              moderatorId: moderator.id,
              reason,
              timestamp: new Date(),
            });
            await serverProfile.save();

            // Count total warnings for this member
            const memberWarnings = serverProfile.warnings.members.filter(
              (w) => w.userId === target.id
            );

            // Notify the user
            await target
              .send(
                `⚠️ You have been warned in **${message.guild.name}** by **${moderator.tag}**.\n` +
                  `Reason: ${reason}\n` +
                  `You now have **${memberWarnings.length}/${WARN_LIMIT}** warnings.`
              )
              .catch(() => {});
            const embed = new EmbedBuilder()
              .setColor("Yellow")
              .setDescription(
                `# ⚠️ Warning ⚠️\n**${target.user.tag}**, please watch your language!\n**Reason:** ${reason}\n**Warnings:** ${memberWarnings.length}/${WARN_LIMIT}\n⚠️ Continued violations may lead to further action.`
              );
            // Notify the channel
            await message.channel.send({
              embeds: [embed],
            });

            // Check if the member reached the warning limit
            if (memberWarnings.length >= WARN_LIMIT) {
              // Determine action from server settings
              const limitAction = serverProfile.warnings.action || "mute";

              // Avoid recursive warn call
              if (limitAction.toLowerCase() !== "warn") {
                const punishmentReason = `Reached maximum warnings (${WARN_LIMIT})`;
                await require("./punishment").execute(
                  message,
                  limitAction,
                  message.guild.members.me,
                  target,
                  null,
                  punishmentReason
                );
                await Server.updateOne(
                  { serverId: message.guild.id },
                  {
                    $pull: {
                      "warnings.members": { userId: target.id },
                    },
                  }
                );
              }
            }
          } catch (error) {
            console.error("❌ Warn action failed:", error);
            await message.channel.send("❌ Failed to issue warning.");
          }
          break;
        }

        case "kick": {
          try {
            await target.kick(reason);
            return await moderationLog(
              message,
              "Kick",
              moderator,
              target.user,
              null,
              reason
            );
          } catch (error) {
            console.error(error);
          }
          break;
        }

        case "ban": {
          try {
            if (
              !message.guild.members.me.permissions.has(
                PermissionsBitField.Flags.BanMembers
              )
            )
              return;

            await target
              .send(
                `⛔ You have been banned from **${message.guild.name}** by **${moderator.tag}**.\nReason: ${reason}`
              )
              .catch(() => {});

            serverProfile.warnings.members =
              serverProfile.warnings.members.filter(
                (member) => member.userId !== target.id
              );
            await serverProfile.save();
            await message.guild.members.ban(target, { reason });
            return await moderationLog(
              message,
              "Ban",
              moderator,
              target,
              null,
              reason
            );
          } catch (error) {
            console.error(error);
          }
          break;
        }

        case "mute": {
          try {
            let muteRole = message.guild.roles.cache.find(
              (r) => r.name === "Muted"
            );

            // If no "Muted" role, create one
            if (!muteRole) {
              muteRole = await message.guild.roles.create({
                name: "Muted",
                color: "#2f3136",
                permissions: [],
              });

              // Remove send perms from channels
              message.guild.channels.cache.forEach(async (channel) => {
                await channel.permissionOverwrites.edit(muteRole, {
                  SendMessages: false,
                  Speak: false,
                  AddReactions: false,
                });
              });
            }

            await target.roles.add(muteRole, reason);
            await target
              .send(
                `🔇 You have been muted in **${message.guild.name}** by **${moderator.tag}**.\nReason: ${reason}`
              )
              .catch(() => {});

            await message.channel.send(
              `🔇 ${target.user.tag} has been **muted** by ${moderator.tag}.`
            );
          } catch (error) {
            console.error(error);
          }
          break;
        }

        case "tempban": {
          try {
            if (!ts || isNaN(ts)) {
              return message.channel.send(
                "❌ Please provide a valid ban duration in milliseconds."
              );
            }

            if (
              !message.guild.members.me.permissions.has(
                PermissionsBitField.Flags.BanMembers
              )
            ) {
              return message.channel.send(
                "❌ I don't have permission to ban members."
              );
            }

            await target
              .send(
                `⛔ You have been temporarily banned from **${
                  message.guild.name
                }** by **${moderator.tag}**.\nDuration: ${
                  ts / 1000 / 60
                } minutes\nReason: ${reason}`
              )
              .catch(() => {});

            await message.guild.members.ban(target, { reason });
            await message.channel.send(
              `⛔ ${target.user.tag} has been **temp-banned** by ${
                moderator.tag
              } for ${ts / 1000 / 60} minutes.`
            );

            // Unban after duration
            setTimeout(async () => {
              try {
                await message.guild.members.unban(target.id, "Tempban expired");
                await message.channel.send(
                  `✅ ${target.tag} has been unbanned (tempban expired).`
                );
              } catch (error) {
                console.error(`Failed to unban ${target.tag}:`, error);
              }
            }, ts);
          } catch (error) {
            console.error(error);
          }
          break;
        }

        default:
          message.channel.send("❌ Invalid action.");
      }
    } catch (error) {
      console.error(error);
    }
  },
};

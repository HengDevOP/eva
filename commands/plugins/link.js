// commands/automation/link.js
const Servers = require("../../models/servers");
const {
  memberPermissions,
  premiumAccess,
  checkMaintenance,
} = require("../../utilities/permissions");

module.exports = {
  name: "link",
  description: "Link Protection",
  category: ["Automation"],
  permissions: ["Administrator"],

  async execute(message, args) {
    try {
      const subcommand = args[0]?.toLowerCase();
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return;

      if (await checkMaintenance(message)) return;
      if (!(await premiumAccess(message))) return;

      const config = serverProfile.plugins?.linkProtection;
      if (!config) {
        serverProfile.plugins.linkProtection = { enabled: false };
      }

      switch (subcommand) {
        case "enable": {
          try {
            if (!memberPermissions(message)) return;
            if (config.enabled)
              return message.channel.send(
                `⚠️ Link Protection is already enabled.`
              );
            config.enabled = true;
            await serverProfile.save();
            return message.channel.send(`✅ Link Protection has been enabled.`);
          } catch (err) {
            console.error("Error enabling Link Protection:", err);
            return message.channel.send(`❌ Failed to enable Link Protection.`);
          }
        }

        case "disable": {
          try {
            if (!memberPermissions(message)) return;
            if (!config.enabled)
              return message.channel.send(
                `⚠️ Link Protection is already disabled.`
              );
            config.enabled = false;
            await serverProfile.save();
            return message.channel.send(
              `❌ Link Protection has been disabled.`
            );
          } catch (err) {
            console.error("Error disabling Link Protection:", err);
            return message.channel.send(
              `❌ Failed to disable Link Protection.`
            );
          }
        }

        case "message": {
          try {
            if (!memberPermissions(message)) return;
            const newMessage = args.slice(1).join(" ");
            if (!newMessage)
              return message.channel.send(
                `❌ Please provide a custom message.`
              );
            if (newMessage.length > 256)
              return message.channel.send(
                `⚠️ Message too long (${newMessage.length}/256 characters).`
              );

            config.message = newMessage;
            await serverProfile.save();
            return message.channel.send(`✅ Custom message updated!`);
          } catch (err) {
            console.error("Error updating custom message:", err);
            return message.channel.send(`❌ Failed to update message.`);
          }
        }

        case "add": {
          try {
            if (!memberPermissions(message)) return;

            const channel =
              message.mentions.channels.first() ||
              message.guild.channels.cache.get(args[1]);
            if (!channel)
              return message.channel.send(
                `❌ Please mention or provide a valid channel ID.`
              );

            if (!config.allowedChannels) config.allowedChannels = [];
            if (config.allowedChannels.includes(channel.id))
              return message.channel.send(`⚠️ ${channel} is already added.`);

            config.allowedChannels.push(channel.id);
            await serverProfile.save();
            return message.channel.send(
              `✅ Added ${channel} to allowed channels.`
            );
          } catch (err) {
            console.error("Error adding channel to allowed list:", err);
            return message.channel.send(`❌ Failed to add allowed channel.`);
          }
        }

        case "remove": {
          try {
            if (!memberPermissions(message)) return;

            const channel =
              message.mentions.channels.first() ||
              message.guild.channels.cache.get(args[1]);
            if (!channel)
              return message.channel.send(
                `❌ Please mention or provide a valid channel ID.`
              );

            if (!config.allowedChannels?.includes(channel.id))
              return message.channel.send(
                `⚠️ ${channel} is not in the allowed list.`
              );

            config.allowedChannels = config.allowedChannels.filter(
              (id) => id !== channel.id
            );
            await serverProfile.save();
            return message.channel.send(
              `🚫 Removed ${channel} from allowed channels.`
            );
          } catch (err) {
            console.error("Error removing channel:", err);
            return message.channel.send(`❌ Failed to remove allowed channel.`);
          }
        }

        case "bypass": {
          try {
            if (!memberPermissions(message)) return;

            const url = args[1];
            if (!url)
              return message.channel.send(`❌ Please provide a URL to bypass.`);

            if (!config.allowedLink) config.allowedLink = [];

            let normalizedUrl = url.trim();

            // Auto-add https:// if missing
            if (!/^https?:\/\//i.test(normalizedUrl)) {
              normalizedUrl = `https://${normalizedUrl}`;
            }

            // Validate using URL constructor
            try {
              const parsed = new URL(normalizedUrl);

              if (parsed.protocol !== "https:") {
                return message.channel.send(
                  `⚠️ Only **HTTPS** links are allowed.`
                );
              }

              const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              if (!domainRegex.test(parsed.hostname)) {
                return message.channel.send(`⚠️ Invalid domain name.`);
              }
            } catch {
              return message.channel.send(`⚠️ Invalid URL format.`);
            }

            // ✅ Add/remove toggle for bypass link
            if (config.allowedLink.includes(normalizedUrl)) {
              config.allowedLink = config.allowedLink.filter(
                (link) => link !== normalizedUrl
              );
              await serverProfile.save();
              return message.channel.send(
                `🚫 Removed **${normalizedUrl}** from bypass list.`
              );
            } else {
              config.allowedLink.push(normalizedUrl);
              await serverProfile.save();
              return message.channel.send(
                `✅ Added **${normalizedUrl}** to bypass list.`
              );
            }
          } catch (err) {
            console.error("Error in bypass command:", err);
            return message.channel.send(
              `❌ An unexpected error occurred while processing your request.`
            );
          }
        }

        default: {
          try {
            const enabled = config.enabled ? "✅ Enabled" : "❌ Disabled";
            const allowedChannels = config.allowedChannels?.length
              ? config.allowedChannels.map((id) => `<#${id}>`).join(", ")
              : "None";
            const allowedLinks = config.allowedLink?.length
              ? config.allowedLink.join(", ")
              : "None";
            const messageText = config.message || "Not set";

            return message.channel.send(
              `🛡️ **Link Protection Settings**
Status: ${enabled}
Allowed Channels: ${allowedChannels}
Bypass Links: ${allowedLinks}
Message: ${messageText}

Usage:
\`!link enable | disable | message <text> | add #channel | remove #channel | bypass <url>\``
            );
          } catch (err) {
            console.error("Error displaying Link Protection settings:", err);
            return message.channel.send(`❌ Failed to display settings.`);
          }
        }
      }
    } catch (err) {
      console.error("Unexpected error in link command:", err);
      return message.channel.send(
        `❌ Something went wrong while running this command.`
      );
    }
  },
};

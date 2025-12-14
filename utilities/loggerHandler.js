const { EmbedBuilder } = require("discord.js");

module.exports = {
  async executeLogger(message, data = { logChannel: String }) {
    try {
      const embed = new EmbedBuilder();
      switch (data.case) {
        case "ban": {
          embed.setTitle("🚫 User Banned").addFields(
            {
              name: "👤 User",
              value: `${data.username} (${data.userId})`,
              inline: false,
            },
            {
              name: "📝 Reason",
              value: data.reason || "No reason provided",
              inline: false,
            },
            {
              name: "👮 Moderator",
              value: `${data.moderator || "Unknown"}`,
              inline: false,
            }
          );
          break;
        }
        case "unban": {
          embed.setTitle("✅ User Unbanned").addFields(
            {
              name: "👤 User",
              value: `${data.username} (${data.userId})`,
              inline: false,
            },
            {
              name: "👮 Moderator",
              value: `${data.moderator || "Unknown"}`,
              inline: false,
            }
          );
          break;
        }
        case "autounban": {
          embed.setTitle("⏰ User Auto-Unbanned").addFields(
            {
              name: "👤 User",
              value: `${data.username} (${data.userId})`,
              inline: false,
            },
            {
              name: "👮 Moderator",
              value: `${data.moderator || "Unknown"}`,
              inline: false,
            }
          );
          break;
        }
        case "timeout": {
          embed.setTitle("⏳ User Timed Out").addFields(
            {
              name: "👤 User",
              value: `${data.username} (${data.userId})`,
              inline: false,
            },
            {
              name: "📝 Duration",
              value: data.duration || "No duration provided",
              inline: false,
            },
            {
              name: "👮 Moderator",
              value: `${data.moderator || "Unknown"}`,
              inline: false,
            }
          );
          break;
        }
        default: {
          console.warn("Unknown log case:", data.case);
        }
      }
    } catch (error) {
      console.error("Logger Handler Error:", error);
    }
  },
};

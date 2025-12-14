const { EmbedBuilder } = require("discord.js");
const Servers = require("../models/servers");
const { generateMessage } = require("./placeHolder");

module.exports = {
  async execute(member) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: member.guild.id,
      });

      if (!serverProfile) return; // We can't do much if no serverProfile

      const config = serverProfile.plugins?.farewell;

      if (config?.enabled) {
        let channelToSend = member.guild.channels.cache.get(config.channel);

        if (!channelToSend) {
          channelToSend = await member.guild.channels
            .fetch(config.channel)
            .catch(() => null);
        }

        if (channelToSend) {
          const messageToSend = await generateMessage(
            member,
            config.messageContent,
            "farewell"
          );

          if (config.isEmbed) {
            const title = await generateMessage(
              member,
              config.embed.title || "Goodbye!",
              "farewell"
            );
            const description = await generateMessage(
              member,
              config.embed.description || "We're sad to see you leave!",
              "farewell"
            );

            let color = config.embed.color || "#FFFFFF";
            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = "#FFFFFF";

            const embed = new EmbedBuilder()
              .setTitle(title)
              .setDescription(description)
              .setColor(color);

            if (config.embed.footer?.trim())
              embed.setFooter({ text: config.embed.footer });

            if (config.embed.thumbnail) {
              embed.setThumbnail(
                replacePlaceholders(config.embed.thumbnail, member)
              );
            }

            // Send embed + message
            channelToSend
              .send({ content: messageToSend, embeds: [embed] })
              .catch(console.error);
          } else {
            // Send plain message
            channelToSend.send({ content: messageToSend }).catch(console.error);
          }
        }
      }

      console.log(`[Farewell] Processed farewell for ${member.user.tag}`);
    } catch (error) {
      console.error("Error executing farewell:", error);
    }
  },
};

function replacePlaceholders(text, member) {
  if (!text || typeof text !== "string") return text;

  return text
    .replace(/{user}/g, member.user.displayAvatarURL({ dynamic: true }))
    .replace(/{servericon}/g, member.guild.iconURL({ dynamic: true }) || "");
}

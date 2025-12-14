const { EmbedBuilder } = require("discord.js");
const Servers = require("../models/servers");
const { generateMessage } = require("./placeHolder");

module.exports = {
  async execute(member) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: member.guild.id,
      });

      if (serverProfile && serverProfile.plugins?.greeting?.enabled) {
        const greetingConfig = serverProfile.plugins.greeting;

        // Try cache first
        let channelToSend = member.guild.channels.cache.get(
          greetingConfig.channel
        );

        // If not in cache, try fetch
        if (!channelToSend) {
          channelToSend = await member.guild.channels
            .fetch(greetingConfig.channel)
            .catch(() => null);
        }

        // Only continue if the channel exists
        if (channelToSend) {
          const messageToSend = await generateMessage(
            member,
            greetingConfig.messageContent,
            "greeting"
          );

          console.log(messageToSend);

          try {
            if (greetingConfig.isEmbed) {
              const title = await generateMessage(
                member,
                greetingConfig.embed.title || "Welcome to the Server!",
                "greeting"
              );

              const description = await generateMessage(
                member,
                greetingConfig.embed.description || "Welcome to the server!",
                "greeting"
              );

              let color = greetingConfig.embed.color || "#FFFFFF";
              // Validate color format (must be 6-digit hex)
              if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                color = "#FFFFFF";
              }

              const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color);

              // ✅ Only set footer if it's not null/empty
              const footer = greetingConfig.embed.footer?.trim();
              if (footer) {
                embed.setFooter({ text: footer });
              }

              // ✅ Set thumbnail if available
              if (greetingConfig.embed.thumbnail) {
                const thumbnail = replacePlaceholders(
                  greetingConfig.embed.thumbnail,
                  member
                );
                embed.setThumbnail(thumbnail);
              }

              return await channelToSend.send({
                content: messageToSend, // Always include greeting text
                embeds: [embed],
              });
            } else {
              return await channelToSend.send({
                content: messageToSend,
              });
            }
          } catch (sendError) {
            console.error("Failed to send greeting message:", sendError);
          }
        }
      }
    } catch (error) {
      console.error("Error executing greeting:", error);
    }
  },
};

function replacePlaceholders(text, member) {
  if (!text || typeof text !== "string") return text;

  return text
    .replace(/{user}/g, member.user.displayAvatarURL({ dynamic: true }))
    .replace(/{servericon}/g, member.guild.iconURL({ dynamic: true }) || "");
}

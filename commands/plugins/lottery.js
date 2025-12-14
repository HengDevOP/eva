const { EmbedBuilder } = require("discord.js");
const Servers = require("../../models/servers");
const { memberPermissions } = require("../../utilities/permissions");
const check = process.env.CHECK;
const uncheck = process.env.UNCHECK;
module.exports = {
  name: "lottery",
  description: "lottery currency",
  usage: "!lottery",
  category: ["Plugins"],
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return;

      if (!serverProfile.currency.enabled) {
        return message.channel.send(
          `${uncheck} Currency is not enabled in this server.`
        );
      }
      const action = args[0]?.toLowerCase();
      switch (action) {
        case "enable": {
          if (!memberPermissions(message)) return;

          if (serverProfile.currency.lottery.enabled) {
            return message.channel.send(
              `${uncheck} Lottery is already enabled in this server.`
            );
          }
          serverProfile.currency.lottery.enabled = true;
          await serverProfile.save();
          return message.channel.send(
            `${check} Lottery is now enabled in this server.`
          );
        }
        case "info": {
          const embed = new EmbedBuilder()
            .setDescription(`# Lottery`)
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/128/8814/8814192.png"
            )
            .addFields({
              name: `Required Plugins`,
              value: `\`Currency\``,
              inline: true,
            });
          return message.channel.send({ embeds: [embed] });
        }
        default: {
          const embed = new EmbedBuilder()
            .setDescription(`# Lottery`)
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/128/8814/8814192.png"
            );
        }
      }
    } catch (error) {
      console.error(error);
      message.reply(`Something went wrong: ${error.message}`);
    }
  },
};

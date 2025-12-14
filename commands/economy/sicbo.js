// commands/sicbo.js
const { EmbedBuilder } = require("discord.js");
const Servers = require("../../models/servers");

module.exports = {
  name: "sicbo",
  description: "Play Sic Bo and bet your currency.",
  usage: "!sicbo <bet_amount> <bet_type>",
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return message.reply("⚠️ Server profile not found.");

      const action = args[0]?.toLowerCase();

      switch (action) {
        case "start": {
          if (serverProfile.currency.sicbo.enabled) {
            return message.reply(`Sicbo is running on your server!`);
          }
        }
      }
    } catch (err) {
      console.error(err);
      message.reply("❌ An error occurred while playing Sic Bo.");
    }
  },
};

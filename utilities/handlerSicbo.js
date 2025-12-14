const Servers = require("../models/servers");

module.exports = {
  async execute(interaction) {
    const serverProfile = await Servers.findOne({
      serverId: interaction.guild.id,
    });

    if (!serverProfile) return;
  },
};

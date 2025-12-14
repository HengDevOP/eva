const Servers = require("../../models/servers");
const {
  memberPermissions,
  checkMaintenance,
  premiumAccess,
} = require("../../utilities/permissions");

module.exports = {
  name: "response",
  description: "Create your own custom bot response command",
  async execute(message, args) {
    try {
      // execute block code here
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });

      if (!serverProfile) return;
      if (await checkMaintenance(message)) return;
      if (await premiumAccess(message)) return;
      if (!memberPermissions(message)) return;
      const data = serverProfile.plugins.response;
      const action = args[0]?.toLowerCase();
      switch (action) {
        case " enable": {
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};

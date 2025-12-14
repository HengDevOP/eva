const Servers = require("../../models/servers");
const check = process.env.CHECK;
const uncheck = process.env.UNCHECK;
const { memberPermissions } = require("../../utilities/permissions");

module.exports = {
  name: "fee",
  description: "fee plugins",
  alias: ["fee"],
  category: ["Plugins"],
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return;

      if (!serverProfile.currency.enabled) {
        return message.channel.send(
          `${uncheck} Currency is not enabled on this server, so Taxfees cannot be set.`
        );
      }
      const action = args[0]?.toLowerCase();
      switch (action) {
        case "set": {
          if (!memberPermissions(message)) return;
          const percentage = Number(args[1]);
          if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            return message.channel.send(
              `${uncheck} Please provide a valid percentage between 0 and 100.`
            );
          }
          serverProfile.currency.fee.feeApply = percentage;
          await serverProfile.save();
          return message.channel.send(
            `${check} Taxfee set has been successfully set to ${percentage}%.`
          );
        }
        case "enable": {
          if (!memberPermissions(message)) return;
          if (serverProfile.currency.fee.enabled) {
            return message.channel.send(
              `${uncheck} Taxfee is already enabled in this server.`
            );
          } else {
            serverProfile.currency.fee.enabled = true;
            await serverProfile.save();
            return message.channel.send(
              `${check} Taxfee has been enabled in this server.`
            );
          }
        }
        case "disable": {
          if (!memberPermissions(message)) return;
          if (!serverProfile.currency.fee.enabled) {
            return message.channel.send(
              `${uncheck} Taxfee is already disabled.`
            );
          } else {
            serverProfile.currency.fee.enabled = false;
            await serverProfile.save();
            return message.channel.send(
              `${check} Taxfee has been disabled in this server.`
            );
          }
        }
        default: {
          // view
          const feeStatus = serverProfile.currency.fee.enabled;
          return message.channel.send(
            `Taxfee is currently ${
              feeStatus ? "enabled" : "disabled"
            } in this server.`
          );
        }
      }
    } catch (error) {
      console.error("Error executing fee command:", error);
      message.channel.send("An error occurred while executing the command.");
    }
  },
};

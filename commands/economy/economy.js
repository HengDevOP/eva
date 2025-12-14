const Economy = require("../../models/economy");

module.exports = {
  name: "economy",
  description: "Economy commands",
  usage: "!economy <command>",
  async execute(message, args) {
    const economyProfile = await Economy.findOne({
      serverId: message.guild.id,
    });
    if (!economyProfile) {
      // create one
      const newProfile = new Economy({
        serverId: message.guild.id,
        users: [],
        icon: "💰",
      });
      await newProfile.save();
    }

    switch (args[0]) {
      case "icon": {
        // set new economy icon server
        const newIcon = args[1];
        if (!newIcon)
          return message.reply("❌ Please provide a new icon for the economy.");
        const profile = await Economy.findOne({ serverId: message.guild.id });
        profile.icon = newIcon;
        await profile.save();
        return message.reply(
          `✅ Economy icon updated to ${newIcon} successfully!`
        );
      }
      case "prune": {
        // remove users last active more than 30 days
        const profile = await Economy.findOne({ serverId: message.guild.id });
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const initialCount = profile.users.length;
        profile.users = profile.users.filter(
          (u) => now - new Date(u.lastActive).getTime() <= THIRTY_DAYS
        );
        const prunedCount = initialCount - profile.users.length;
        await profile.save();
        return message.reply(
          `✅ Pruned ${prunedCount} inactive users from the economy.`
        );
      }
      case "reme":
        return require("./reme").execute(message, args.slice(1));
      default:
        return message.reply(
          "❌ Unknown economy command. Available commands: balance, reme"
        );
    }
  },
};

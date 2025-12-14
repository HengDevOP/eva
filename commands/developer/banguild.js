const BlacklistGuild = require("../../models/blacklist");

module.exports = {
  name: "banguild",
  description: "Ban a guild and force the bot to leave it",

  async execute(message, args, client) {
    const ownerId = process.env.OWNER_ID;

    // Only bot owner can use
    if (message.author.id !== ownerId) {
      return message.reply("❌ You are not allowed to use this command.");
    }

    const guildId = args[0];

    if (!guildId) {
      return message.reply(
        "❌ Please provide a guild ID.\nExample: `banguild 123456789012345678`"
      );
    }

    // Check if bot is in that guild
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return message.reply("⚠️ I'm not in that guild, or the ID is invalid.");
    }

    try {
      const guildName = guild.name;

      // 1️⃣ Save guild ID into blacklist database
      await BlacklistGuild.updateOne(
        {},
        { $addToSet: { blacklist: guildId } }, // prevents duplicate entries
        { upsert: true } // create if missing
      );

      // 2️⃣ Leave the guild
      await guild.leave();

      // 3️⃣ DM confirmation
      try {
        await message.author.send(
          `🚫 **Guild Banned:** ${guildName}\n📌 Guild ID: \`${guildId}\`\nThe bot has left and it has been added to blacklist.`
        );
      } catch {
        message.reply("⚠️ Banned & left the guild, but couldn't DM you.");
      }

      // 4️⃣ Normal reply
      return message.reply(
        `✅ Successfully banned **${guildName}** and added it to the blacklist.`
      );
    } catch (err) {
      console.error(err);
      return message.reply(
        "❌ Failed to ban the guild. Check console for details."
      );
    }
  },
};

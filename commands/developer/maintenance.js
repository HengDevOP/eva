const { state, client } = require("../../bot.js");

module.exports = {
  name: "maintenance",
  alias: ["mt"],
  async execute(message, args) {
    const ownerId = process.env.OWNER_ID;
    if (message.author.id !== ownerId) return;

    // Toggle maintenance
    const current = state.get("maintenance") || false;
    state.set("maintenance", !current);

    await message.channel.send(
      `🛠️ Bot maintenance mode is now **${
        state.get("maintenance") ? "enabled" : "disabled"
      }**.`
    );
  },
};

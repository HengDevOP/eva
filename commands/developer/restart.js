module.exports = {
  name: "restart",
  alias: ["reload"],
  async execute(message, args, client) {
    await message.reply("♻️ Restarting bot...");
    process.exit(0);
  },
};

const Servers = require("../models/servers");

module.exports = {
  async execute(message) {
    try {
      // 🚫 Ignore bots or DMs
      if (!message.guild || message.author.bot) return;

      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return;

      const config = serverProfile.plugins?.linkProtection;
      if (!config || !config.enabled) return;

      const allowedLinks = config.allowedLink || [];
      const allowedChannels = config.allowedChannels || [];
      const messageContent = message.content.toLowerCase();

      // 🧠 Skip checks for Administrators
      if (message.member.permissions.has("Administrator")) return;

      // 🧠 Skip checks for allowed channels
      if (allowedChannels.includes(message.channel.id)) return;

      // ✅ Skip check if message contains an allowed link
      const isAllowed = allowedLinks.some((link) =>
        messageContent.includes(link.toLowerCase())
      );
      if (isAllowed) return;

      // 🔗 Detect any link in message
      const linkRegex = /(https?:\/\/[^\s]+)/gi;
      if (linkRegex.test(messageContent)) {
        await message.delete().catch(() => {});

        // 📢 Send custom or default warning message
        const customMessage =
          config.message ||
          `${message.author}, links are not allowed in this channel!`;

        return message.channel.send(customMessage);
      }
    } catch (err) {
      console.error("Error in linkProtection:", err);
    }
  },
};

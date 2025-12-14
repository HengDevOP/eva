const Servers = require("../models/servers");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  async execute(member) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: member.guild.id,
      });
      if (serverProfile) {
        if (serverProfile.plugins.nameguard.enabled) {
          const config = serverProfile.plugins.nameguard;
          // Use nickname if set, otherwise fallback to globalName, then username
          const displayName = (
            member.nickname ||
            member.user.globalName ||
            member.user.username
          ).toLowerCase();

          const matchedWord = config.blacklist.find((word) =>
            displayName.includes(word.toLowerCase())
          );
          if (matchedWord) {
            // Skip administrators
            if (
              !member.permissions.has(PermissionsBitField.Flags.Administrator)
            ) {
              require("../utilities/punishment").execute(
                member,
                "kick",
                member,
                member,
                null,
                "Using prohabite name"
              );
              // Try to DM the user
              try {
                const embed = new EmbedBuilder();
                const defaultContent =
                  config.message ||
                  `# Notification from ${member.guild.name}\nYour name **"${displayName}"** is not allowed in this server.\nReason: 🚫 Prohibited display name\nPlease update your name to follow the community guidelines and you may return at any time.`;
                embed.setDescription(defaultContent);
                await member.send({ embeds: [embed] });
              } catch (err) {
                console.log(`❌ Could not DM ${member.user.tag}`);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error.code === 50013) return;
      console.error(error);
    }
  },
};

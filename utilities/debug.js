const { EmbedBuilder } = require("discord.js");

module.exports = {
  async debug(commandName, message, memberId, debugMessage) {
    try {
      // Try to get the member from the guild cache
      const member = await message.guild.members.cache.get(memberId);
      const embed = new EmbedBuilder()
        .setTitle("Debug Report")
        .setDescription(
          [
            `**Guild Name:** ${message.guild.name}`,
            `**Guild ID:** ${message.guild.id}`,
            `**Command:** ${commandName}`,
            `**Issue:**\n\`\`\`js\n${debugMessage}\n\`\`\``,
          ].join("\n")
        )
        .setTimestamp();
      if (member) {
        await member.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (error) {
      console.error("Error sending DM:", error);
    }
  },
};

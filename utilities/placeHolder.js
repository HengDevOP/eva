module.exports = {
  /**
   * Generates a greeting or farewell message with placeholders replaced.
   * @param {GuildMember} member - The Discord guild member
   * @param {string} textMessage - The custom message (optional)
   * @param {string} type - "greeting" or "farewell" (used to set default message)
   * @returns {string} - The final message with placeholders replaced
   */
  async generateMessage(member, textMessage, type = "greeting") {
    try {
      const memberCount = member.guild.memberCount;

      // Helper for ordinal numbers
      const ordinalSuffix = (n) => {
        const j = n % 10,
          k = n % 100;
        if (j === 1 && k !== 11) return n + "st";
        if (j === 2 && k !== 12) return n + "nd";
        if (j === 3 && k !== 13) return n + "rd";
        return n + "th";
      };

      // Default messages
      const defaultMessages = {
        greeting:
          "\\a:join:1424068939637330112 {username} has joined the server.",
        farewell:
          "\\a:left:1424073164480053328 {username} has left the server.",
      };

      let liveMessage =
        textMessage || defaultMessages[type] || defaultMessages.greeting;

      // Replace placeholders
      liveMessage = liveMessage
        .replace(/{pinguser}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{usertag}/g, member.user.tag)
        .replace(/{userid}/g, member.id)
        .replace(/{servername}/g, member.guild.name)
        .replace(/{usernickname}/g, member.displayName)
        .replace(/{membercount}/g, memberCount)
        .replace(/{membercount_ordinal}/g, ordinalSuffix(memberCount))
        .replace(
          /{createdat}/g,
          `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
        )
        .replace(
          /{joinedat}/g,
          `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
        )
        .replace(/\\n/g, "\n"); // Support multi-line messages

      // Convert Discord emoji format: \a:emoji:name:id or \:emoji:name:id => <a:...> or <:...>
      liveMessage = liveMessage.replace(/\\(a?:[A-Za-z0-9_]+:\d+)/g, "<$1>");

      return liveMessage;
    } catch (error) {
      console.error("❌ Error generating message:", error);
      return type === "farewell"
        ? "Goodbye from the server!"
        : "Welcome to the server!";
    }
  },
};

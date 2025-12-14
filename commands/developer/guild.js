// 📁 commands/guild.js
const { EmbedBuilder } = require("discord.js");
const ownerId = process.env.OWNER_ID;

module.exports = {
  name: "guild",
  description: "Check how many servers the bot is in and liss them.",
  aliases: ["servers", "guilds"],
  async execute(message, args) {
    if (message.author.id !== ownerId) return;
    const guilds = [...message.client.guilds.cache.values()];
    const totalGuilds = guilds.length;

    // ✅ Sort guilds by member count (descending)
    guilds.sort((a, b) => b.memberCount - a.memberCount);

    // ✅ Build list of guild info
    const guildList = guilds.map(
      (g, i) =>
        `**${i + 1}.** ${g.name} — 👥 ${g.memberCount.toLocaleString()} members`
    );

    // ✅ Split into chunks of 10 for pagination
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < guildList.length; i += chunkSize) {
      chunks.push(guildList.slice(i, i + chunkSize));
    }

    // ✅ Create first embed
    let page = 0;
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`🌐 I'm in ${totalGuilds} servers`)
      .setDescription(chunks[page].join("\n"))
      .setFooter({ text: `Page ${page + 1} of ${chunks.length}` });

    const sentMessage = await message.channel.send({ embeds: [embed] });

    // ✅ Add reactions for navigation
    await sentMessage.react("⬅️");
    await sentMessage.react("➡️");

    // ✅ If only one page, no need for pagination
    if (chunks.length === 1) return;

    const filter = (reaction, user) =>
      ["⬅️", "➡️"].includes(reaction.emoji.name) &&
      user.id === message.author.id;

    const collector = sentMessage.createReactionCollector({
      filter,
    });

    collector.on("collect", (reaction, user) => {
      reaction.users.remove(user.id);

      if (reaction.emoji.name === "⬅️") {
        page = page > 0 ? page - 1 : chunks.length - 1;
      } else if (reaction.emoji.name === "➡️") {
        page = page + 1 < chunks.length ? page + 1 : 0;
      }

      const newEmbed = EmbedBuilder.from(embed)
        .setDescription(chunks[page].join("\n"))
        .setFooter({ text: `Page ${page + 1} of ${chunks.length}` });

      sentMessage.edit({ embeds: [newEmbed] });
    });

    collector.on("end", () => {
      sentMessage.reactions.removeAll().catch(() => {});
    });
  },
};

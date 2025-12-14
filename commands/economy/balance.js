const { EmbedBuilder } = require("discord.js");
const Economy = require("../../models/economy");

module.exports = {
  name: "balance",
  aliases: ["bal", "money"],
  description: "Check your balance",
  usage: "!balance",

  async execute(message, args) {
    try {
      const serverId = message.guild.id;
      const userId = message.author.id;

      // FIND SERVER PROFILE
      let economyProfile = await Economy.findOne({ serverId });

      // If server not exist create
      if (!economyProfile) {
        economyProfile = await new Economy({
          serverId,
          users: [],
        }).save();
      }

      // FIND USER PROFILE
      let userProfile = economyProfile.users.find((u) => u.id === userId);

      // Create user if not exist
      if (!userProfile) {
        economyProfile.users.push({
          id: userId,
          balance: 0,
          bank: 0,
          createdAt: Date.now(),
        });
        await economyProfile.save();
        userProfile = economyProfile.users.find((u) => u.id === userId);
      }

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s balance`)
        .addFields(
          {
            name: `Main Balance`,
            value: `${economyProfile.icon || "💰"} ${format(
              userProfile.balance
            )}`,
            inline: true,
          },
          {
            name: `Bank Balance`,
            value: `${economyProfile.icon || "💰"} ${format(userProfile.bank)}`,
            inline: true,
          },
          {
            name: `Transfer Limit`,
            value: `${economyProfile.icon || "💰"} ${format(
              userProfile.dailySent
            )} / ${format(2000000)}`,
          }
        );

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.log(err);
      return message.reply(`⚠ Something went wrong`);
    }
  },
};

function format(n) {
  return `**${n.toLocaleString()}**`;
}

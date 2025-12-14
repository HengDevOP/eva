// commands/reme.js
const { EmbedBuilder } = require("discord.js");
const Economy = require("../../models/economy");

const icon = "<:roulette:1444591873208488099>";

module.exports = {
  name: "reme",
  description: "Reme casino game",
  usage: "!reme <bet>",

  async execute(message, args) {
    try {
      // Find or create server profile
      let serverProfile = await Economy.findOne({ serverId: message.guild.id });
      if (!serverProfile) {
        serverProfile = new Economy({
          serverId: message.guild.id,
          users: [],
        });
        await serverProfile.save();
      }

      // Find or create user profile
      let userProfile = serverProfile.users.find(
        (u) => u.id === message.author.id
      );
      if (!userProfile) {
        userProfile = { id: message.author.id, balance: 0, bank: 0 };
        serverProfile.users.push(userProfile);
        await serverProfile.save();
      }
      let betArg = args[0];
      let bet;

      // "all" handling
      if (betArg?.toLowerCase() === "all") {
        if (userProfile.balance >= 250000) {
          bet = 250000;
        } else {
          bet = userProfile.balance;
        }
      } else {
        bet = parseInt(betArg);
      }

      // validate bet
      if (!bet || bet <= 0)
        return message.reply("❌ Enter a valid bet amount.");

      if (bet > 250000) return message.reply("❌ Max bet is 250,000 coins.");

      // check balance
      if (userProfile.balance < bet)
        return message.reply("❌ You don't have enough balance!");

      // Deduct bet
      userProfile.balance -= bet;

      const sendMessage = await message.channel.send(
        `${icon} ${message.author.username} is spinning the Reme...`
      );

      await new Promise((r) => setTimeout(r, 1000)); // wait 2 seconds
      // Spin user number 0-36
      const userSpin = Math.floor(Math.random() * 37);
      const userFinal =
        userSpin < 10 ? userSpin : Math.floor(userSpin / 10) + (userSpin % 10);
      await sendMessage.edit(
        `${icon} ${message.author.username} is spinning the Reme... and got **${userSpin}**!`
      );

      await new Promise((r) => setTimeout(r, 1000)); // wait 2 seconds
      await sendMessage.edit(
        `${icon} ${message.author.username} is spinning the Reme... and got **${userSpin}**!\n${icon} The bot is spinning...`
      );

      await new Promise((r) => setTimeout(r, 1000)); // wait 2 seconds
      // Spin bot number 0-36
      const botSpin = Math.floor(Math.random() * 37);
      const botFinal =
        botSpin < 10 ? botSpin : Math.floor(botSpin / 10) + (botSpin % 10);

      await sendMessage.edit(
        `${icon} ${message.author.username} is spinning the Reme... and got **${userSpin}**!\n${icon} The bot is spinning... and got **${botSpin}**!`
      );

      await new Promise((r) => setTimeout(r, 1000)); // wait 2 seconds

      let resultText = "";
      let winnings = 0;

      if (userSpin === 0) {
        winnings = bet * 3;
        userProfile.balance += winnings;
        resultText = `${icon} ${
          message.author.username
        } is spinning the Reme... and got **${userSpin}**!\n${icon} The bot is spinning... and got **${botSpin}**!\nCongratulations! You won \`\`\`ansi
[2;31m[2;32m+${format(winnings)}[0m[2;31m[0m\`\`\``;
      } else if (userFinal > botFinal) {
        winnings = bet;
        userProfile.balance += winnings * 2; // get 2x your bet
        resultText = `${icon} ${
          message.author.username
        } is spinning the Reme... and got **${userSpin}**!\n${icon} The bot is spinning... and got **${botSpin}**!\nCongratulations! You won \`\`\`ansi
[2;31m[2;32m+${format(winnings)}[0m[2;31m[0m\`\`\``;
      } else if (userFinal === botFinal) {
        resultText = `${icon} ${message.author.username} is spinning the Reme... and got **${userSpin}**!\n${icon} The bot is spinning...and got **${botSpin}**!\nYou lose it all!`;
      } else {
        resultText = `${icon} ${
          message.author.username
        } is spinning the Reme... and got **${userSpin}**!\n${icon} The bot is spinning... and got **${botSpin}**!\nYou lost your bet of ${format(
          bet
        )} coins.`;
      }

      await serverProfile.save();

      await sendMessage.edit(resultText);
    } catch (e) {
      console.error(e);
      return message.reply(`⚠ Something went wrong.`);
    }
  },
};

function format(n) {
  return `${n.toLocaleString()} coins`;
}

// commands/currency.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Servers = require("../../models/servers");
const {
  memberPermissions,
  handlerSetup,
} = require("../../utilities/permissions");

const animated = process.env.animated;
const heads = process.env.heads;
const tails = process.env.tails;

// Create a Map to track cooldowns outside of execute function
const freeFlipCooldown = new Map();

const icon = process.env.ICON;
const check = process.env.CHECK;
const uncheck = process.env.UNCHECK;

module.exports = {
  name: "coinflip",
  alias: ["cf"],
  description: "Play a coinflip game and win or lose currency.",
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return handlerSetup(message);

      const coinflipConfig = serverProfile.plugins.coinflip;
      const economyConfig = serverProfile.plugins.economy;

      const action = args[0]?.toLowerCase();
      const embed = new EmbedBuilder();

      switch (action) {
        case "enable": {
          if (!memberPermissions(message)) return;
          if (coinflipConfig.enabled) {
            return message.channel.send(
              `${uncheck} Coinflip is already enabled in this server.`
            );
          }
          coinflipConfig.enabled = true;
          await serverProfile.save();
          return message.channel.send(
            `${check} Coinflip is now enabled in this server.`
          );
        }
        case "disable": {
          if (!memberPermissions(message)) return;
          if (!coinflipConfig.enabled) {
            return message.channel.send(
              `${uncheck} Coinflip is already disabled in this server.`
            );
          }
          coinflipConfig.enabled = false;
          await serverProfile.save();
          return message.channel.send(
            `${check} Coinflip is now disabled in this server.`
          );
        }

        case "min": {
          if (!memberPermissions(message)) return;
          const newMinBet = parseInt(args[1]);
          if (isNaN(newMinBet) || newMinBet <= 0) {
            return message.channel.send(
              `${uncheck} Minimum bet must be greater than 0.`
            );
          }
          coinflipConfig.minBet = newMinBet;
          await serverProfile.save();
          return message.channel.send(
            `${check} Minimum bet has been updated to ${
              economyConfig.icon
            } ${formatNumber(newMinBet)}.`
          );
        }

        case "max": {
          if (!memberPermissions(message)) return;
          const newMaxBet = parseInt(args[1]);
          if (isNaN(newMaxBet) || newMaxBet <= 0) {
            return message.channel.send(
              `${uncheck} Maximum bet must be greater than 0.`
            );
          }
          coinflipConfig.maxBet = newMaxBet;
          await serverProfile.save();
          return message.channel.send(
            `${check} Maximum bet has been updated to ${
              economyConfig.icon
            } ${formatNumber(newMaxBet)}.`
          );
        }

        case "bank": {
          const bank = coinflipConfig.bank || 0;
          const historyBank = coinflipConfig.historyBank || 0;

          // Calculate profit/loss
          const profitLoss = bank - historyBank;
          const status = profitLoss >= 0 ? "📈 Profit" : "📉 Loss";

          // Update historyBank
          coinflipConfig.historyBank = bank;
          await serverProfile.save();

          // Create embed
          const embed = new EmbedBuilder()
            .setTitle("Coinflip Bank")
            .setColor(profitLoss >= 0 ? "Green" : "Red")
            .addFields(
              {
                name: "Current Bank",
                value: `${economyConfig.icon} ${formatNumber(bank)}`,
                inline: true,
              },
              {
                name: "Last Profit/Loss",
                value: `${status}: ${economyConfig.icon} ${formatNumber(
                  Math.abs(profitLoss)
                )}`,
                inline: true,
              }
            )
            .setTimestamp();

          return message.channel.send({ embeds: [embed] });
        }

        case "dep": {
          if (!memberPermissions(message)) return;
          const userProfile = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!userProfile) {
            return message.channel.send(
              `❌ You do not have an economy account.`
            );
          }

          const amount = parseInt(args[1]);
          if (isNaN(amount) || amount <= 0) {
            return message.channel.send(
              `⚠️ Usage: \`!coinflip dep <amount>\` (amount must be greater than 0)`
            );
          }

          if (userProfile.mainBalance < amount) {
            return message.channel.send(
              `❌ You do not have enough ${
                economyConfig.icon
              } to deposit ${formatNumber(amount)} into the coinflip bank.`
            );
          }

          // Transfer funds
          userProfile.mainBalance -= amount;
          coinflipConfig.bank += amount;
          await serverProfile.save();

          return message.channel.send(
            `✅ You have deposited ${economyConfig.icon} ${formatNumber(
              amount
            )} into the coinflip bank. Current bank: ${
              economyConfig.icon
            } ${formatNumber(coinflipConfig.bank)}.`
          );
        }

        case "wit": {
          if (!memberPermissions(message)) return;
          const userProfile = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!userProfile) {
            return message.channel.send(
              `❌ You do not have an economy account.`
            );
          }

          const amount = parseInt(args[1]);
          if (isNaN(amount) || amount <= 0) {
            return message.channel.send(
              `⚠️ Usage: \`!coinflip wit <amount>\` (amount must be greater than 0)`
            );
          }

          if (coinflipConfig.bank < amount) {
            return message.channel.send(
              `❌ The coinflip bank does not have enough funds to withdraw ${formatNumber(
                amount
              )}. Current bank: ${economyConfig.icon} ${formatNumber(
                coinflipConfig.bank
              )}.`
            );
          }

          // Withdraw funds
          coinflipConfig.bank -= amount;
          userProfile.mainBalance += amount;
          await serverProfile.save();

          return message.channel.send(
            `✅ You have withdrawn ${economyConfig.icon} ${formatNumber(
              amount
            )} from the coinflip bank. Current bank: ${
              economyConfig.icon
            } ${formatNumber(coinflipConfig.bank)}.`
          );
        }

        case "outcomemessage": {
          if (!memberPermissions(message)) return;

          const newMessage = args.slice(1).join(" ");
          if (!newMessage) {
            return message.channel.send(
              `⚠️ Usage: \`!coinflip outcomemessage <message|reset>\``
            );
          }

          if (newMessage.toLowerCase() === "reset") {
            coinflipConfig.outcomeMessage = null;
            await serverProfile.save();
            return message.channel.send(
              `✅ Outcome message has been reset to default.`
            );
          }

          coinflipConfig.outcomeMessage = newMessage;
          await serverProfile.save();
          return message.channel.send(`✅ Outcome message has been updated.`);
        }

        case "ongoingmessage": {
          if (!memberPermissions(message)) return;

          const newMessage = args.slice(1).join(" ");
          if (!newMessage) {
            return message.channel.send(
              `⚠️ Usage: \`!coinflip ongoingmessage <message|reset>\``
            );
          }

          if (newMessage.toLowerCase() === "reset") {
            coinflipConfig.ongoingMessage = null;
            await serverProfile.save();
            return message.channel.send(
              `✅ Ongoing message has been reset to default.`
            );
          }

          coinflipConfig.ongoingMessage = newMessage;
          await serverProfile.save();
          return message.channel.send(`✅ Ongoing message has been updated.`);
        }

        default: {
          // 🎮 Default: User plays the game
          if (!coinflipConfig.enabled) return;

          let bet = null;
          let choice = null;

          const now = Date.now();
          const cooldownAmount = 5000; // 3 seconds

          // Free flip (no bet)
          if (args.length === 0) {
            if (freeFlipCooldown.has(message.author.id)) {
              const expirationTime =
                freeFlipCooldown.get(message.author.id) + cooldownAmount;
              if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                const warningMessage = await message.channel.send(
                  `${message.author.username}, please wait **${timeLeft}s** before flipping a free coin again.`
                );
                setTimeout(
                  () => warningMessage.delete().catch(() => {}),
                  expirationTime - now
                );
                return;
              }
            }

            freeFlipCooldown.set(message.author.id, now);

            const result = Math.random() < 0.5 ? "heads" : "tails";
            return message.channel.send(
              `${message.author.username}, you have flipped a coin and it landed on **${result}**.`
            );
          }

          // check if user have economy account
          const userProfile = economyConfig.members.find(
            (m) => m.id === message.author.id
          );
          if (!userProfile) {
            return message.channel.send(`You do not have economy account.`);
          }

          if (freeFlipCooldown.has(message.author.id)) {
            const expirationTime =
              freeFlipCooldown.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
              const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
              const warningMessage = await message.channel.send(
                `${message.author.username}, please wait **${timeLeft}s** before flipping a free coin again.`
              );
              setTimeout(
                () => warningMessage.delete().catch(() => {}),
                expirationTime - now
              );
              return;
            }
          }

          freeFlipCooldown.set(message.author.id, now);

          // Determine bet & choice regardless of order
          for (const arg of args) {
            if (!isNaN(arg)) bet = parseInt(arg);
            else if (["heads", "tails", "h", "t"].includes(arg.toLowerCase()))
              choice = arg.toLowerCase();
          }

          if (!bet || !choice) {
            return message.channel.send(
              `${uncheck} Invalid format. Example: \`!cf 200 heads\` or \`!cf heads 200\``
            );
          }

          // check if user have enough balance to place the bet
          if (userProfile.mainBalance < bet) {
            return message.channel.send(
              `You do not have enough ${economyConfig.icon} to bet at this amount.`
            );
          }

          // Validate bet range
          if (bet < coinflipConfig.minBet) {
            return message.channel.send(
              `${uncheck} Minimum bet is ${economyConfig.icon} ${formatNumber(
                coinflipConfig.minBet
              )}.`
            );
          }
          if (coinflipConfig.maxBet && bet > coinflipConfig.maxBet) {
            return message.channel.send(
              `${uncheck} Maximum bet is ${economyConfig.icon} ${formatNumber(
                coinflipConfig.maxBet
              )}.`
            );
          }

          // ✅ Check if bank has enough to pay winner
          if (coinflipConfig.bank < bet) {
            return message.channel.send(
              `${uncheck} The Coinflip bank does not have enough funds to cover your potential winnings. Try a smaller bet or wait for the bank to be replenished.`
            );
          }

          const userChoice = choice.startsWith("h") ? "Heads" : "Tails";

          // Ensure default messages if null or empty
          const ongoingMessageTemplate =
            coinflipConfig.ongoingMessage?.trim() ||
            `**${message.author.username}** spent {icon}{betamount} and chose {choice}\nThe coin is spinning ${animated}`;

          // Prepare ongoing message
          const ongoingMessage = replaceHolder({
            text: ongoingMessageTemplate,
            choice: userChoice,
            outcome: "???",
            amount: bet, // original bet for ongoing display
            won: false, // we don't know yet
            icon: economyConfig.icon,
            betAmount: bet, // show original bet amount
          });

          // Send ongoing message
          const sendMessage = await message.channel.send(ongoingMessage);

          // Deduct user's bet immediately
          userProfile.mainBalance -= bet;

          await serverProfile.save();

          // Wait 2 seconds then show outcome
          setTimeout(async () => {
            // ✅ Play the game
            const result = Math.random() < 0.5 ? "Heads" : "Tails";
            const resultIcon = result === "Heads" ? heads : tails; // ✅ FIXED
            let outcomeMessage;

            if (userChoice === result) {
              // Winner
              const totalWin = bet * 2;
              coinflipConfig.bank -= bet; // Deduct payout from bank
              userProfile.mainBalance += totalWin;
              const outcomeMessageTemplate =
                coinflipConfig.outcomeMessage?.trim() ||
                `**${message.author.username}** spent {icon}{betamount} and chose {choice}\nThe coin is spinning ${resultIcon}. Congratulation you {won} {icon}{amount}.`;

              outcomeMessage = replaceHolder({
                text: outcomeMessageTemplate,
                choice: userChoice,
                outcome: result,
                amount: totalWin, // total winning
                won: true,
                icon: economyConfig.icon,
                betAmount: bet, // original bet
              });
            } else {
              // Loser
              coinflipConfig.bank += bet; // Add lost bet to bank

              const outcomeMessageTemplate =
                coinflipConfig.outcomeMessage?.trim() ||
                `**${message.author.username}** spent {icon}{betamount} and chose {choice}\nThe coin is spinning ${resultIcon}. Good luck next time.`;

              outcomeMessage = replaceHolder({
                text: outcomeMessageTemplate,
                choice: userChoice,
                outcome: result,
                amount: 0, // no winnings
                won: false,
                icon: economyConfig.icon,
                betAmount: bet, // original bet
              });
            }

            await serverProfile.save();
            await sendMessage.edit({ content: outcomeMessage });
          }, 2000);
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};

function replaceHolder({
  text,
  choice,
  outcome,
  amount,
  won,
  icon,
  betAmount,
}) {
  if (!text || typeof text !== "string") return "";

  // Calculate total winning amount if user won
  const totalWin = won ? betAmount * 2 : 0;

  return text
    .replace(/{choice}/g, `**${choice}**`) // User choice: heads/tails
    .replace(/{outcome}/g, outcome) // Coin flip result
    .replace(/{betamount}/g, formatNumber(betAmount)) // Original bet amount
    .replace(/{amount}/g, formatNumber(totalWin)) // Total winning amount
    .replace(/{won}/g, won ? "won" : "lost") // Won or lost text
    .replace(/{icon}/g, icon || ""); // Optional currency icon
}

// Reuse your formatNumber helper
function formatNumber(number) {
  return `**${number.toLocaleString()}**`;
}

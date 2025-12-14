// commands/transfer.js
const Economy = require("../../models/economy");
const DAILY_LIMIT = 2000000;

module.exports = {
  name: "transfer",
  description: "Transfer coins to another user",
  async execute(message, args) {
    try {
      const target = message.mentions.users.first();
      if (!target) return message.reply("❌ Please mention a user.");
      if (target.id === message.author.id)
        return message.reply("❌ You cannot transfer to yourself.");

      let amount = args[1];
      if (!amount) return message.reply("❌ Enter amount to give.");

      if (amount.toLowerCase() === "all") {
        const serverEconomy = await Economy.findOne({
          serverId: message.guild.id,
        });
        const sender = serverEconomy.users.find(
          (u) => u.id === message.author.id
        );
        amount = sender.balance;
      }

      if (isNaN(amount) || amount <= 0)
        return message.reply("❌ Invalid amount.");

      amount = parseInt(amount);

      const serverEconomy = await Economy.findOne({
        serverId: message.guild.id,
      });

      if (!serverEconomy) return message.reply("⚠ Economy not setup.");

      let sender = serverEconomy.users.find((u) => u.id === message.author.id);
      if (!sender) return message.reply("⚠ You do not have an account.");

      let receiver = serverEconomy.users.find((u) => u.id === target.id);
      if (!receiver) {
        receiver = {
          id: target.id,
          balance: 0,
          bank: 0,
          dailySent: 0,
          lastTransfer: 0,
        };
        serverEconomy.users.push(receiver);
      }

      // ► Reset sender daily limit if day changed
      const today = new Date().toDateString();

      if (sender.lastTransfer !== today) {
        sender.dailySent = 0;
        sender.lastTransfer = today;
      }

      // ► check daily limit
      if (sender.dailySent + amount > DAILY_LIMIT) {
        const left = DAILY_LIMIT - sender.dailySent;
        return message.reply(
          `❌ You exceeded daily transfer limit.\n` +
            `You can still send **${format(left)}** coins today.`
        );
      }

      if (sender.balance < amount)
        return message.reply("❌ Not enough balance!");

      // tax 10%
      const tax = Math.floor(amount * 0.1);
      const finalAmount = amount - tax;

      sender.balance -= amount;
      receiver.balance += finalAmount;
      sender.dailySent += amount;

      await serverEconomy.save();

      message.reply(
        `💸 Transfer Successful!\n\n` +
          `➡️ Receiver: <@${target.id}>\n` +
          `📤 Sent: ${format(finalAmount)}\n` +
          `⚠ Tax: ${format(tax)} (10%)\n\n` +
          `📅 Daily Transfer Used: ${format(sender.dailySent)} / ${format(
            DAILY_LIMIT
          )}`
      );
    } catch (err) {
      console.log(err);
      return message.reply("⚠ Something went wrong.");
    }
  },
};

function format(n) {
  return `**${n.toLocaleString()}**`;
}

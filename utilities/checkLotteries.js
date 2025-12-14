// modules/lotteryHandler.js
const Servers = require("../models/servers");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  async checkLotteries(client) {
    try {
      const servers = await Servers.find({ "currency.lottery.enabled": true });

      for (const server of servers) {
        const guild = await client.guilds
          .fetch(server.serverId)
          .catch(() => null);
        if (!guild) continue;

        for (let i = server.currency.lottery.data.length - 1; i >= 0; i--) {
          const lottery = server.currency.lottery.data[i];
          const now = new Date();
          const endAt = new Date(lottery.endAt);

          const sendResult = async () => {
            let winner = null;
            if (lottery.participants.length > 0) {
              const winnerIndex = Math.floor(
                Math.random() * lottery.participants.length
              );
              winner = lottery.participants[winnerIndex];
            }

            const channel = await guild.channels
              .fetch(lottery.channelId)
              .catch(() => null);
            if (channel) {
              const embed = new EmbedBuilder()
                .setTitle("🎉 Lottery Result")
                .setDescription(
                  winner
                    ? `Congratulations <@${winner.id}>! You won the lottery.`
                    : "No participants joined the lottery."
                )
                .setColor("Yellow")
                .setFooter({
                  text: `Total participants: ${lottery.participants.length}`,
                })
                .setTimestamp();

              await channel.send({ embeds: [embed] }).catch(console.error);
            }

            // Remove lottery from DB
            server.currency.lottery.data.splice(i, 1);
            await server.save();
          };

          if (now >= endAt) {
            // Already expired → send immediately
            sendResult();
          } else {
            // Still ongoing → schedule with setTimeout
            const delay = endAt - now;
            setTimeout(sendResult, delay);
          }
        }
      }
    } catch (err) {
      console.error("Error checking lotteries:", err);
    }
  },
};

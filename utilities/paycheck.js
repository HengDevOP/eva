const { EmbedBuilder } = require("discord.js"); // Make sure this is imported
const Servers = require("../models/servers");

function startPayCheck(client) {
  const intervalMs = 60000; // 5 seconds

  setInterval(async () => {
    const now = Date.now();
    try {
      const allServers = await Servers.find({});

      for (const server of allServers) {
        const guild = client.guilds.cache.get(server.serverId);
        if (!guild) continue;

        const payrollConfig = server.plugins.payroll;
        const economyConfig = server.plugins.economy;
        if (!payrollConfig.enabled || !economyConfig.enabled) continue;

        // Get the payroll channel if configured
        const payrollChannel =
          payrollConfig.channel &&
          guild.channels.cache.get(payrollConfig.channel);

        for (const payer of payrollConfig.roles) {
          const role = guild.roles.cache.get(payer.roleId);
          if (!role) continue;

          const membersPaid = [];

          for (const member of role.members.values()) {
            const memberAccount = economyConfig.members.find(
              (m) => m.id === member.id
            );
            if (memberAccount) {
              memberAccount.mainBalance += payer.payAmount;
              membersPaid.push(member.user?.username || member.id);
            }
          }

          if (payrollChannel && membersPaid.length > 0) {
            const embed = new EmbedBuilder()
              .setTitle("Payroll Distributed")
              .setDescription("Everyone got their payment!")
              .setColor("Green");

            await payrollChannel.send({ embeds: [embed] });
            await sleep(300); // wait 300ms before next message
            console.log(`Paid sent:`);
          }
        }

        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        await server.save();
      }
    } catch (err) {
      console.error("Error running role-based payroll:", err);
    }
  }, intervalMs);

  console.log(
    "✅ Role-based payroll started, running every 5 seconds (for testing)"
  );
}

module.exports = startPayCheck;

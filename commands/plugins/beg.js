// commands/beg.js
const { EmbedBuilder } = require("discord.js");
const Servers = require("../../models/servers");
const icon = process.env.ICON;

const {
  memberPermissions,
  checkMaintenance,
  rateLimited,
} = require("../../utilities/permissions");

const pluginIcon = process.env.pluginIcon;
const check = process.env.CHECK;
const uncheck = process.env.UNCHECK;

module.exports = {
  name: "beg",
  description: "Beg for coins from anyone in the channel",
  usage: "!beg",
  category: ["Plugins"],
  async execute(message, args) {
    try {
      let serverProfile = await Servers.findOne({ serverId: message.guild.id });
      if (!serverProfile) return;

      if (await rateLimited(message)) return;
      if (await checkMaintenance(message)) return;

      const begData = serverProfile.plugins.beg;
      const economyData = serverProfile.plugins.economy;

      const action = args[0]?.toLowerCase();
      switch (action) {
        case "enable": {
          if (!memberPermissions(message)) return;
          if (!economyData.enabled) {
            return await message.reply(
              `${uncheck} Economy plugin must be enabled first.`
            );
          }
          if (begData.enabled) {
            return await message.reply(
              `${uncheck} Beg plugin is already enabled.`
            );
          }
          begData.enabled = true;
          await serverProfile.save();
          return message.reply(`${check} Beg plugin has been enabled.`);
        }
        case "disable": {
          if (!memberPermissions(message)) return;
          if (!begData.enabled) {
            return await message.reply(
              `${uncheck} Beg plugin is already disabled.`
            );
          }
          begData.enabled = false;
          await serverProfile.save();
          return message.reply(`${check} Beg plugin has been disabled.`);
        }

        default: {
          const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle(`${pluginIcon} Missing Dependency Plugin`)
            .setTimestamp();

          // Check if Beg plugin is enabled
          if (!begData.enabled) {
            if (!message.member.permissions.has("Administrator")) return;
            return await message.channel.send(
              `❌ Beg plugin is not enabled on this server.`
            );
          }

          // Check if Economy plugin is enabled
          if (!economyData.enabled) {
            if (!message.member.permissions.has("Administrator")) return;
            embed.setDescription(`> Economy plugin`);
            return await message.channel.send({ embeds: [embed] });
          }

          // Get the begger's economy data
          const beggerEconomy = economyData.members.find(
            (member) => member.id === message.author.id
          );
          if (!beggerEconomy) {
            return await message.channel.send(
              `${message.author}, you don't have an economy account yet! Ask an administrator to create one for you.`
            );
          }

          const now = Date.now();
          const cooldownAmount = begData.cooldown * 1000; // in milliseconds
          // check if user is on cooldown
          const begderData = begData.data.find(
            (data) => data.id === message.author.id
          );
          if (!begderData) {
            // if not, create a new data entry
            begData.data.push({ id: message.author.id, lastBeg: now });
          } else {
            const expirationTime = begderData.lastBeg + cooldownAmount;
            if (now < expirationTime) {
              const timeLeft = expirationTime - now;
              const seconds = Math.floor((timeLeft / 1000) % 60);
              const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
              return await message.channel.send(
                `${message.author}, you are on cooldown! Please wait ${minutes}m ${seconds}s before begging again.`
              );
            } else {
              begderData.lastBeg = now;
            }
          }

          await serverProfile.save();

          // Send begging message
          const begMessage = await message.channel.send(
            `${message.author} is begging for ${economyData.icon}!\n*Reply to this message with an amount within 30 seconds to give.*`
          );

          const beggerId = message.author.id;
          let totalReceived = 0;

          // Collector filter
          const filter = (m) =>
            m.reference?.messageId === begMessage.id &&
            !m.author.bot &&
            m.author.id !== beggerId &&
            !isNaN(m.content);

          const collector = message.channel.createMessageCollector({
            filter,
            time: 30_000, // 30 seconds
          });

          collector.on("collect", async (m) => {
            const amount = parseInt(m.content, 10);
            if (isNaN(amount) || amount <= 0) {
              return await m.react("❌"); // Invalid amount
            }

            const giverEconomy = economyData.members.find(
              (member) => member.id === m.author.id
            );
            if (!giverEconomy) return;

            if (giverEconomy.mainBalance < amount) {
              return await m.react("❌"); // Not enough coins
            }

            // Transfer coins
            beggerEconomy.mainBalance += amount;
            giverEconomy.mainBalance -= amount;
            totalReceived += amount;

            await serverProfile.save();
            await m.react("✅");
          });

          collector.on("end", async () => {
            await begMessage.reply(
              `You have received ${economyData.icon} ${formatNumber(
                totalReceived
              )} begging from ${
                collector.collected.size
              } members. God bless them!`
            );
          });
        }
      }
    } catch (error) {
      console.error(error);
      message.reply(`❌ Something went wrong, try again later.`);
    }
  },
};

function formatNumber(n) {
  return `**${n.toLocaleString()}**`;
}

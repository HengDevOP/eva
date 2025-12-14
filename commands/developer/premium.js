// commands/owner/premium.js
const { EmbedBuilder } = require("discord.js");
const Servers = require("../../models/servers");
require("dotenv").config();

const BOT_OWNER_ID = process.env.OWNER_ID; // Your Discord ID

module.exports = {
  name: "premium",
  description: "Add or remove Premium status for a server",
  category: ["Developer"],
  alias: ["setpremium"],
  async execute(message, args) {
    if (message.author.id !== BOT_OWNER_ID) return;
    const embed = new EmbedBuilder().setColor("Red");

    const action = args[0]?.toLowerCase();
    const serverId = args[1];
    const months = parseInt(args[2]) || 1; // Default 1 month if not provided

    if (!action || !["add", "remove"].includes(action)) {
      embed.setDescription(
        `Command Usage: \`premium [add | remove] guildId [month to add] `
      );
      return message.reply({ embeds: [embed] });
    }

    if (!serverId) {
      embed.setDescription(
        `Please provide an serverId to activate the premium`
      );
      return message.reply({ embeds: [embed] });
    }

    try {
      const serverProfile = await Servers.findOne({ serverId });
      if (!serverProfile) {
        embed.setDescription(
          `I couldn't find that server in the data to upgrade to the premium.`
        );
        return message.reply({ embeds: [embed] });
      }

      if (action === "add") {
        const now = new Date();

        // Determine the base date to add months
        const baseDate =
          serverProfile.premium?.expiresAt &&
          new Date(serverProfile.premium.expiresAt) > now
            ? new Date(serverProfile.premium.expiresAt)
            : now;

        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        // Update premium
        serverProfile.premium = {
          ...serverProfile.premium,
          isEnable: true,
          expiresAt: newExpiry,
        };
        await serverProfile.save();

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(
            `✅ Premium has been **extended** for server ID: \`${serverId}\`.\n🕒 New Expiration: <t:${Math.floor(
              newExpiry.getTime() / 1000
            )}:R>\n📅 Added Duration: **${months} month(s)**`
          );

        message.reply({ embeds: [embed] });

        // DM server owner
        try {
          const guild = await message.client.guilds.fetch(serverId);
          const owner = await guild.fetchOwner();

          function generateInvoiceId() {
            let id = "";
            for (let i = 0; i < 12; i++) {
              id += Math.floor(Math.random() * 10); // adds a random digit 0-9
            }
            return id;
          }

          // Usage
          const invoiceId = generateInvoiceId(); // e.g., "493827105624"
          const totalAmount = months * 4.99;

          const dmEmbed = new EmbedBuilder()
            .setColor("Orange")
            .setDescription(
              `# Premium Purchase Invoice\nHello **${owner.user.username}**, \n\n` +
                `You have successfully upgraded your server **${guild.name}** to **Premium**!\n\n` +
                `📅 **Duration Added:** ${months} month(s)\n` +
                `🗓 **Purchase Date:** <t:${Math.floor(
                  new Date().getTime() / 1000
                )}:F>\n` +
                `💵 **Amount Paid:** $${totalAmount} / Month (one-time purchase, no auto-renew)\n` +
                `🆔 **Invoice ID:** #${invoiceId}\n\n` +
                `Enjoy all exclusive features, automations, and benefits of Premium!\n` +
                `If you need any assistance, feel free to contact our support team. ❤️`
            )
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Server ID: ${guild.id}` });

          await owner.send({ embeds: [dmEmbed] });
        } catch (err) {
          console.error("❌ Failed to DM server owner:", err);
          await message.channel.send("⚠️ Could not DM the server owner.");
        }
        return;
      }

      if (action === "remove") {
        serverProfile.premium.expiresAt = null;
        await serverProfile.save();

        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(
            `❌ Premium has been **removed** from server ID: \`${serverId}\`.`
          );
        return message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error.code);
      return message.reply(
        "❌ An error occurred while managing Premium status."
      );
    }
  },
};

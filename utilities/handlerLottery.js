const Servers = require("../models/servers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  async execute(interaction) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: interaction.guild.id,
      });
      if (!serverProfile) return;

      // Example: interaction.customId = lottery_join_12345678901234
      const [action, lotteryId] = interaction.customId.split("_").slice(1); // ['join','12345678901234']

      const lotteryData = serverProfile.currency.lottery.data.find(
        (l) => l.id.toString() === lotteryId
      );

      if (!lotteryData) {
        return interaction.reply({
          content: "❌ This lottery does not exist or has ended.",
          ephemeral: true,
        });
      }

      switch (action) {
        case "join":
          // Check if user already joined
          if (
            lotteryData.participants.some((p) => p.id === interaction.user.id)
          ) {
            return interaction.reply({
              content: "⚠️ You have already joined this lottery!",
              ephemeral: true,
            });
          }

          // Add participant
          lotteryData.participants.push({ id: interaction.user.id });
          await serverProfile.save();

          // Update the embed footer with participant count
          const channel = interaction.channel;
          const messageId = lotteryData.messageId;
          const msg = await channel.messages.fetch(messageId).catch(() => null);

          if (msg) {
            const embed = msg.embeds[0];
            const updatedEmbed = EmbedBuilder.from(embed).setFooter({
              text: `Participants: ${lotteryData.participants.length}`,
            });
            await msg.edit({ embeds: [updatedEmbed] });
          }

          return interaction.reply({
            content: `✅ You have joined the lottery!`,
            ephemeral: true,
          });

        case "participants":
          // Show participants
          const participantMentions = lotteryData.participants
            .map((p) => `<@${p.id}>`)
            .join("\n");

          const embed = new EmbedBuilder()
            .setTitle("🎟️ Lottery Participants")
            .setDescription(
              participantMentions || "No participants have joined yet."
            )
            .setColor("Yellow")
            .setFooter({
              text: `Total participants: ${lotteryData.participants.length}`,
            })
            .setTimestamp();

          return interaction.reply({ embeds: [embed], ephemeral: true });

        default:
          return interaction.reply({
            content: "❌ Unknown lottery action.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "❌ An error occurred while handling the lottery.",
        ephemeral: true,
      });
    }
  },
};

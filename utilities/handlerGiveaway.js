const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
} = require("discord.js");
const Giveaway = require("../models/giveaway");

//
// Function: Join Giveaway
//
async function execute(interaction) {
  try {
    if (!interaction.isButton()) return;

    const giveawayId = interaction.customId.split("_").slice(2).join("_");

    const giveawayData = await Giveaway.findOne({ giveawayId });
    if (!giveawayData) {
      return interaction.reply({
        content: "❌ Giveaway not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (giveawayData.ended) {
      return interaction.reply({
        content: "⏱️ This giveaway has already ended.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (
      giveawayData.participants.some((p) => p.userId === interaction.user.id)
    ) {
      return interaction.reply({
        content: "❌ You have already joined this giveaway.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // ✅ Store user participation
    giveawayData.participants.push({
      userId: interaction.user.id,
      joinedAt: new Date(),
    });

    // Save updated participants
    await giveawayData.save();

    // Fetch the channel
    let channel =
      interaction.guild.channels.cache.get(giveawayData.channelId) ||
      (await interaction.client.channels
        .fetch(giveawayData.channelId)
        .catch(() => null));
    if (!channel) return;

    // Fetch the message
    let message =
      channel.messages.cache.get(giveawayData.messageId) ||
      (await channel.messages.fetch(giveawayData.messageId).catch(() => null));
    if (!message) return;

    // ✅ Update footer with participant count
    const embed = EmbedBuilder.from(message.embeds[0]).setFooter({
      text: `Giveaway ID: ${giveawayData.giveawayId} | Participants: ${giveawayData.participants.length}`,
    });

    await message.edit({ embeds: [embed], components: message.components });

    await interaction.reply({
      content: "✅ You have joined the giveaway!",
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error(error);
    if (interaction.replied === false) {
      interaction.reply({
        content: "⚠️ Something went wrong while joining the giveaway.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

//
// Function: End Giveaway
//
async function endGiveaway(giveaway, client) {
  try {
    if (giveaway.ended) return;

    giveaway.ended = true;
    await giveaway.save();

    let winners = [];

    // ✅ Pick winners only if participants exist
    if (giveaway.participants.length > 0) {
      const winnersCount = Math.min(
        giveaway.winnersCount,
        giveaway.participants.length
      );

      // Shuffle participants
      const shuffled = [...giveaway.participants].sort(
        () => Math.random() - 0.5
      );

      // Pick winners
      winners = shuffled.slice(0, winnersCount);
    }

    // Fetch the original message
    const channel = await client.channels
      .fetch(giveaway.channelId)
      .catch(() => null);
    if (!channel) return;

    const message = await channel.messages
      .fetch(giveaway.messageId)
      .catch(() => null);
    if (!message) return;

    // ✅ Disable buttons (embed stays same)
    const disabledComponents = message.components.map((row) => {
      return new ActionRowBuilder().addComponents(
        row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true))
      );
    });

    await message.edit({
      embeds: message.embeds,
      components: disabledComponents,
    });

    // ✅ Announce winners / no participants
    if (winners.length > 0) {
      channel.send(
        `🎉 Congratulations ${winners
          .map((w) => `<@${w.userId}>`)
          .join(", ")}! You won **${giveaway.prize}**!`
      );
    } else {
      channel.send(
        `⚠️ Giveaway for **${giveaway.prize}** ended with no participants.`
      );
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = { execute, endGiveaway };

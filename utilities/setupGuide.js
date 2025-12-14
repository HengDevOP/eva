const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const Server = require("../models/servers");

module.exports = {
  async execute(message) {
    try {
      const embed = new EmbedBuilder();

      const serverProfile = await Server.findOne({
        serverId: message.guild.id,
      });

      if (!serverProfile) {
        embed
          .setColor("Yellow")
          .setTitle(`Missing Server Setup`)
          .setDescription(
            `It seems like your server doesn't setup yet! to be able to use our features please click button setup below to setup your server.`
          );
      } else {
        embed
          .setColor("Green")
          .setTitle(`You have already setup the server`)
          .setDescription(
            `Beetle is good to go and work with your server now.`
          );
      }

      const buttonToggle = serverProfile ? true : false;
      const setupButton = new ButtonBuilder()
        .setLabel(`${serverProfile ? `You good to go` : `Setup`}`)
        .setCustomId("setup")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(buttonToggle);
      const termsButton = new ButtonBuilder()
        .setLabel("Terms & Privacy")
        .setCustomId("privacy")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(
        setupButton,
        termsButton
      );

      const sendMessage = await message.channel.send({
        embeds: [embed],
        components: [row],
      });
      const collector = sendMessage.createMessageComponentCollector({});

      collector.on("collect", async (interaction) => {
        try {
          if (interaction.user.id !== message.author.id) {
            return await interaction.deferUpdate();
          }
          if (interaction.customId === "setup") {
            // Try to create server profile atomically
            const result = await Server.updateOne(
              { serverId: interaction.guild.id },
              { $setOnInsert: { serverId: interaction.guild.id } },
              { upsert: true }
            );

            if (result.upsertedCount > 0) {
              // New server profile created
              await interaction.reply({
                content: "✅ Server setup completed successfully! 🎉",
                ephemeral: true,
              });
            } else {
              // Server already exists
              await interaction.reply({
                content: "ℹ️ This server was already set up.",
                ephemeral: true,
              });
            }
          }
        } catch (error) {
          console.error(error);
          await interaction.reply({
            content: "❌ Something went wrong while setting up the server.",
            ephemeral: true,
          });
        }
      });
      return sendMessage;
    } catch (error) {
      if (error.code === 50013) return;
      console.error(error);
    }
  },
};

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const Data = require("../../models/servers");
const { checkMaintenance } = require("../../utilities/permissions");
const maintenanceIcon = process.env.maintenanceIcon;

// Track active games per user to prevent spam
const activeGames = new Set();

module.exports = {
  name: "boomsweeper",
  checkMaintenance,
  async execute(message, args) {
    const betAmount = parseInt(args[0]) || 0;

    if (checkMaintenance(message)) return;

    // Prevent multiple games
    if (activeGames.has(message.author.id))
      return message.reply(
        "⚠️ You already have an active BoomSweeper game! Finish it first."
      );

    // Validate bet
    if (!betAmount || betAmount <= 0)
      return message.channel.send("❌ Please enter a valid bet amount.");

    // Fetch server data
    const serverProfile = await Data.findOne({ serverId: message.guild.id });
    if (!serverProfile)
      return message.channel.send("❌ Server data not found.");

    // Find user economy profile
    const userData = serverProfile.plugins.economy.members.find(
      (m) => m.id === message.author.id
    );

    if (!userData)
      return message.channel.send(
        "❌ You do not have an economy account. Create one with `!create`."
      );

    // Check balance from mainBalance
    if (userData.mainBalance < betAmount)
      return message.channel.send("❌ You don’t have enough balance to bet.");

    // Deduct bet
    userData.mainBalance -= betAmount;
    await serverProfile.save();

    // Mark user as in-game
    activeGames.add(message.author.id);

    // Game setup
    const boomIndex = Math.floor(Math.random() * 16);
    const openedTiles = new Set();
    let gameOver = false;
    let safeClicks = 0;

    // UI Builder
    const generateGrid = (disabled = false) => {
      const rows = [];
      for (let row = 0; row < 4; row++) {
        const rowButtons = new ActionRowBuilder();
        for (let col = 0; col < 4; col++) {
          const index = row * 4 + col;
          let label = "⬜";
          let style = ButtonStyle.Secondary;

          if (openedTiles.has(index)) {
            if (index === boomIndex) {
              label = "💣";
              style = ButtonStyle.Danger;
            } else {
              label = "✅";
              style = ButtonStyle.Success;
            }
          }

          rowButtons.addComponents(
            new ButtonBuilder()
              .setCustomId(`tile_${index}`)
              .setLabel(label)
              .setStyle(style)
              .setDisabled(disabled || openedTiles.has(index))
          );
        }
        rows.push(rowButtons);
      }

      // Add payout button (disabled if < 5 safe clicks)
      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("payout")
            .setLabel("💸 Payout")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || safeClicks < 5)
        )
      );

      return rows;
    };

    const embed = new EmbedBuilder()
      .setTitle("💣 BoomSweeper")
      .setDescription(
        `You bet **${betAmount.toLocaleString()}** coins.\nPick a tile! Avoid the boom 💥`
      )
      .setColor("Yellow")
      .setFooter({
        text: "1 mine hidden • Cash out after 5 safe tiles and finish in 1m30s.",
      });

    const gameMessage = await message.channel.send({
      embeds: [embed],
      components: generateGrid(),
    });

    const collector = gameMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 90_000,
    });

    collector.on("collect", async (interaction) => {
      if (gameOver) return interaction.deferUpdate();

      if (interaction.customId.startsWith("tile_")) {
        const index = parseInt(interaction.customId.split("_")[1]);
        if (openedTiles.has(index)) return interaction.deferUpdate();

        openedTiles.add(index);

        if (index === boomIndex) {
          gameOver = true;
          embed
            .setDescription(
              `💥 You hit the boom and lost your bet of **${betAmount.toLocaleString()}** coins!`
            )
            .setColor("Red");

          await interaction.update({
            embeds: [embed],
            components: generateGrid(true),
          });

          activeGames.delete(message.author.id);
          collector.stop("boom");
        } else {
          safeClicks++;
          const multiplier = (1 + safeClicks * 0.2).toFixed(2);
          embed.setDescription(
            `✅ Safe! You’ve opened **${safeClicks}** tiles.\n` +
              `💰 Current Multiplier: **x${multiplier}**\n` +
              `💸 Payout if cashed: **${Math.floor(
                betAmount * multiplier
              ).toLocaleString()}** coins.\n\n` +
              `🟡 You need at least **5 safe tiles** to cash out!`
          );

          await interaction.update({
            embeds: [embed],
            components: generateGrid(),
          });
        }
      }

      if (interaction.customId === "payout") {
        if (safeClicks < 5) {
          return interaction.reply({
            content:
              "⚠️ You need at least **5 safe tiles** before cashing out!",
            ephemeral: true,
          });
        }

        gameOver = true;
        const multiplier = (1 + safeClicks * 0.2).toFixed(2);
        const winnings = Math.floor(betAmount * multiplier);

        userData.mainBalance += winnings;
        await serverProfile.save();

        embed
          .setDescription(
            `💸 You cashed out safely after **${safeClicks}** tiles!\n` +
              `🏆 Multiplier: **x${multiplier}**\n` +
              `You won **${winnings.toLocaleString()}** coins!`
          )
          .setColor("Green");

        await interaction.update({
          embeds: [embed],
          components: generateGrid(true),
        });

        activeGames.delete(message.author.id);
        collector.stop("payout");
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time" && !gameOver) {
        gameOver = true;
        embed
          .setDescription("⌛ Time’s up! Game ended. You lost your bet.")
          .setColor("Grey");

        await gameMessage.edit({
          embeds: [embed],
          components: generateGrid(true),
        });

        activeGames.delete(message.author.id);
      }
    });
  },
};

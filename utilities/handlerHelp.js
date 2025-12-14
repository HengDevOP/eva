const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
let listCommands = require("../../help/currency.json");

async function handlerCurrencyHelp(interaction) {
  // ✅ Sort commands alphabetically by name
  listCommands = listCommands.sort((a, b) => a.name.localeCompare(b.name));

  // ✅ 10 per page
  const commandsPerPage = 10;
  const totalPages = Math.ceil(listCommands.length / commandsPerPage);
  let currentPage = 1;

  const getPageEmbed = (page) => {
    const start = (page - 1) * commandsPerPage;
    const end = start + commandsPerPage;
    const commands = listCommands.slice(start, end);

    const description = commands
      .map(
        (cmd) =>
          `${serverProfile.prefix || "!"} **${cmd.name}**\n${cmd.description}`
      )
      .join("\n");

    return new EmbedBuilder()
      .setTitle("💰 Currency Help Commands")
      .setThumbnail(message.client.user.displayAvatarURL())
      .setDescription(description || "No currency commands found.")
      .setFooter({ text: `Page ${page} of ${totalPages}` });
  };

  const getButtons = (page) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("first")
        .setLabel("<<")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("<")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("page")
        .setLabel(`Page ${page}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel(">")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages),
      new ButtonBuilder()
        .setCustomId("last")
        .setLabel(">>")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages)
    );

  const embed = getPageEmbed(currentPage);
  const row = getButtons(currentPage);

  const reply = await message.reply({
    embeds: [embed],
    components: [row],
  });

  if (interaction.customId === "first") currentPage = 1;
  if (interaction.customId === "prev" && currentPage > 1) currentPage--;
  if (interaction.customId === "next" && currentPage < totalPages)
    currentPage++;
  if (interaction.customId === "last") currentPage = totalPages;

  const newEmbed = getPageEmbed(currentPage);
  const newRow = getButtons(currentPage);

  await interaction.update({
    embeds: [newEmbed],
    components: [newRow],
  });
}

module.exports = { handlerCurrencyHelp };

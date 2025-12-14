const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const verificationToken = require("../../models/verificationToken");

module.exports = {
  name: "create",
  async execute(message, args) {
    try {
      const embed = new EmbedBuilder();

      // generate 16 character secret token
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let secretToken = "";
      for (let i = 0; i < 16; i++) {
        secretToken += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }

      await verificationToken.create({
        userId: message.author.id,
        guildId: message.guild.id,
        secretToken: secretToken,
      });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Verify Here")
          .setStyle("Link")
          .setURL(
            `http://localhost:3000/verify?userId=${message.author.id}&guildId=${message.guild.id}&token=${secretToken}`
          )
      );
      await message.reply({
        embeds: [
          embed
            .setTitle("Verification Link Created")
            .setDescription(
              `Click the button below to verify your account. The link will expire in 10 minutes.`
            )
            .setColor("Green"),
        ],
        components: [row],
      });
    } catch (error) {
      console.error(error);
    }
  },
};

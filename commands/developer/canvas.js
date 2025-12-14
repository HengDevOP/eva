const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const drawProfileCard = require("../../canvas/handlerCanvas");

module.exports = {
  name: "canvas",
  async execute(message, args) {
    try {
      const targetUser = message.member;
      const buffer = await drawProfileCard({
        username: targetUser.user.username,
        discriminator: targetUser.user.discriminator,
        avatarURL: targetUser.user.displayAvatarURL({
          extension: "png",
          size: 256,
        }),
        message: "Welcome!",
        width: 300,
        height: 150,
      });

      // Prepare image attachment
      const attachment = new AttachmentBuilder(buffer, {
        name: "greeting.png",
      });

      // Send embed (image is displayed inside only)
      await message.channel.send({
        files: [attachment],
      });
    } catch (err) {
      console.error(err);
    }
  },
};

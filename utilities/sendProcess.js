const { EmbedBuilder } = require("discord.js");

/**
 * Sends a processing embed and returns helper functions to update it.
 * @param {Message} message - The Discord message object
 * @param {string} title - The title of the process (e.g. "Deposit")
 * @returns {Object} { msg, success(), fail() }
 */
async function sendProcessing(message, title = "Processing") {
  const processingIcon = process.env.PROCESSING;
  const successIcon = process.env.CHECK;
  const failIcon = process.env.UNCHECK;

  // Send initial message
  const embed = new EmbedBuilder()
    .setColor("Yellow")
    .setTitle(`${processingIcon} ${title}`)
    .setDescription("Please wait while we process your request...");

  const msg = await message.channel.send({ embeds: [embed] });

  return {
    msg,

    /** Mark as successful */
    async ok(description = "Your request was completed successfully!") {
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${successIcon} ${title} Completed`)
            .setDescription(description),
        ],
      });
    },

    /** Mark as failed */
    async no(description = "Something went wrong!") {
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle(`${failIcon} ${title} Failed`)
            .setDescription(description),
        ],
      });
    },
  };
}

module.exports = { sendProcessing };

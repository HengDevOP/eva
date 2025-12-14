const Server = require("../models/servers");
const { memberPermissions } = require("./permissions");

async function defaultCommandPrefix(message, args) {
  try {
    if (!memberPermissions(message)) return;

    // Load server profile
    let serverProfile = await Server.findOne({ serverId: message.guild.id });
    if (!serverProfile) return;

    // If no args, show the current prefix
    if (!args.length) {
      return message.reply(
        `The current server prefix is \`${
          serverProfile.prefix || process.env.PREFIX
        }\``
      );
    }

    // Update prefix
    const newPrefix = args[0].toLowerCase();
    console.log(newPrefix);

    if (newPrefix.length > 2) {
      embed
        .setDescription(`Prefix can't be longer than 2 characters.`)
        .setColor("Red");
      return await message.reply(`Prefix can't be longer than 2 characters.`);
    }

    serverProfile.prefix = newPrefix;
    await serverProfile.save();

    await message.reply(`Server prefix has been updated to \`${newPrefix}\``);
  } catch (error) {
    if (error.code === 50013) return;
    console.error(error);
    await message.reply("⚠️ Something went wrong while updating the prefix.");
  }
}

async function defaultCommandHelp(message, args) {
  try {
    const command = require("../commands/others/help");
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    await message.reply("⚠️ Couldn't load help command.");
  }
}

module.exports = { defaultCommandPrefix, defaultCommandHelp };

const { EmbedBuilder } = require("discord.js");
const Security = require("../../models/securitySchema");
const { memberPermissions } = require("../../utilities/permissions");
const on = process.env.ON;
const off = process.env.OFF;

module.exports = {
  name: "security",
  description: "Security System",
  async execute(message, args, client) {
    try {
      if (!memberPermissions(message)) return;

      const action = args[0]?.toLowerCase();
      let securityProfile = await Security.findOne({
        serverId: message.guild.id,
      });

      switch (action) {
        case "enable": {
          // if not existing create one
          // If not existing, create a new one with default protections
          if (!securityProfile) {
            securityProfile = await Security.create({
              serverId: message.guild.id,
            });
            await securityProfile.save();
            return message.reply(
              `✅ Security system has been enabled for this server with default protections!`
            );
          }
        }
        case "disable": {
          if (!securityProfile) return;
          securityProfile.enabled = false;
          await securityProfile.save();
          return await message.reply(`Security is now disabled.`);
        }

        case "add": {
          const targetBot = message.mentions.users.first();
          if (!targetBot.bot || !targetBot) {
            return message.reply(
              `Tag a bot to add into the security whitelist.`
            );
          }
          const existingWhitelistBot = securityProfile.whitelist.find(
            (bot) => bot.id === targetBot.id
          );
          if (existingWhitelistBot) {
            return await message.reply(
              `This bot is already in the security whitelist.`
            );
          }
          securityProfile.whitelist.push({
            id: targetBot.id,
          });

          await securityProfile.save();
          return await message.reply(
            `${targetBot} has been added into security whitelist.`
          );
        }
        case "remove": {
        }
        default: {
          if (!securityProfile) return;
          const embed = new EmbedBuilder()
            .setTitle(`Security System`)
            .setDescription(
              `${securityProfile.antiInviteCreate ? on : off} Invites Create\n${
                securityProfile.antiChannelCreate ? on : off
              } Channels Create\n${
                securityProfile.antiRoleCreate ? on : off
              } Roles Create\n${
                securityProfile.antiBotBan ? on : off
              } Bot Ban\n`
            );

          return await message.reply({ embeds: [embed] });
        }
      }
    } catch (error) {
      if (error.code === 50013) return;
      console.error(error);
    }
  },
};

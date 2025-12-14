const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

// load files
const Servers = require("../../models/servers");
const {} = require("../../utilities/ticketHandler");

module.exports = {
  name: "ticket",
  description: "Create a support ticket",
  category: ["Plugins"],
  async execute(message, args) {
    try {
      // Create embed with open ticket button
      const embed = new EmbedBuilder();

      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return;

      const subcommand = args[0]?.toLowerCase();

      switch (subcommand) {
        case "setup": {
          embed
            .setColor("Blurple")
            .setTitle("🎫 Beetle Support Ticket")
            .setDescription(
              "Need assistance? Our team is here to help!\n\n" +
                "📌 Click the button below to **open a ticket**.\n" +
                "A staff member will respond as soon as possible."
            )
            .setFooter({
              text: "powered by beetlebot.dev",
            });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Create Ticket")
              .setCustomId("create_ticket")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🎟️")
          );

          const sendMessage = await message.channel.send({
            embeds: [embed],
            components: [row],
          });

          // save the database
          serverProfile.tickets.ticketPanel = sendMessage.id;
          await serverProfile.save();
          break;
        }
        case "claimrole": {
          const targetRole = message.mentions.roles.first();

          if (!targetRole) {
            return message.reply(
              `❌ Please mention a valid role to add to the claim list.`
            );
          }

          // Initialize array if not exists
          if (!Array.isArray(serverProfile.tickets.claimRoles)) {
            serverProfile.tickets.claimRoles = [];
          }

          // Check if role already exists
          const alreadyExists = serverProfile.tickets.claimRoles.includes(
            targetRole.id
          );
          if (alreadyExists) {
            return message.reply(
              `⚠️ The role **${targetRole.name}** is already in the claim list.`
            );
          }

          // Push roleId instead of full role object (cleaner & faster lookups)
          serverProfile.tickets.claimRoles.push(targetRole.id);
          await serverProfile.save();

          return message.reply(
            `✅ The role **${targetRole.name}** has been added to the claim list.`
          );
        }
        case "closedcategory": {
          const targetCategoryId = args[1]; // should be the channel ID
          const targetCategoryChannel =
            message.guild.channels.cache.get(targetCategoryId);

          // Check if the channel exists
          if (!targetCategoryChannel) {
            return message.reply("❌ Could not find a channel with that ID.");
          }

          // Check if the channel is a category
          if (targetCategoryChannel.type !== ChannelType.GuildCategory) {
            return message.reply("❌ The specified channel is not a category.");
          }

          // Save to server profile
          serverProfile.tickets.closedTicketCategory = targetCategoryChannel.id;
          await serverProfile.save();

          return message.reply(
            `✅ Closed ticket category has been set to **${targetCategoryChannel.name}**.`
          );
        }
        case "closedcategory": {
          const targetCategoryId = args[1]; // should be the channel ID
          const targetCategoryChannel =
            message.guild.channels.cache.get(targetCategoryId);

          if (!targetCategoryChannel) {
            return message.reply("❌ Could not find a channel with that ID.");
          }

          if (targetCategoryChannel.type !== ChannelType.GuildCategory) {
            return message.reply("❌ The specified channel is not a category.");
          }

          serverProfile.tickets.closedTicketCategory = targetCategoryChannel.id;
          await serverProfile.save();

          return message.reply(
            `✅ Closed ticket category has been set to **${targetCategoryChannel.name}**.`
          );
        }

        case "activecategory": {
          const targetCategoryId = args[1];
          const targetCategoryChannel =
            message.guild.channels.cache.get(targetCategoryId);

          if (!targetCategoryChannel) {
            return message.reply("❌ Could not find a channel with that ID.");
          }

          if (targetCategoryChannel.type !== ChannelType.GuildCategory) {
            return message.reply("❌ The specified channel is not a category.");
          }

          serverProfile.tickets.activeTicketCategory = targetCategoryChannel.id;
          await serverProfile.save();

          return message.reply(
            `✅ Active ticket category has been set to **${targetCategoryChannel.name}**.`
          );
        }

        case "pendingcategory": {
          const targetCategoryId = args[1];
          const targetCategoryChannel =
            message.guild.channels.cache.get(targetCategoryId);

          if (!targetCategoryChannel) {
            return message.reply("❌ Could not find a channel with that ID.");
          }

          if (targetCategoryChannel.type !== ChannelType.GuildCategory) {
            return message.reply("❌ The specified channel is not a category.");
          }

          serverProfile.tickets.pendingTicketCategory =
            targetCategoryChannel.id;
          await serverProfile.save();

          return message.reply(
            `✅ Pending ticket category has been set to **${targetCategoryChannel.name}**.`
          );
        }
        case "transcript": {
          const targetChannel =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]);

          // Check if the channel exists
          if (!targetChannel) {
            return message.reply(
              "❌ Please mention a channel or provide a valid channel ID."
            );
          }

          // Check if it's a text-based channel
          if (
            targetChannel.type !== ChannelType.GuildText &&
            targetChannel.type !== ChannelType.GuildAnnouncement
          ) {
            return message.reply(
              "❌ The specified channel must be a text-based channel (text or announcement)."
            );
          }

          // Save transcript channel
          serverProfile.tickets.transcriptChannel = targetChannel.id;
          await serverProfile.save();

          return message.reply(
            `✅ Transcript channel has been set to **#${targetChannel.name}**.`
          );
        }

        default: {
          embed
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/128/12519/12519801.png"
            )
            .setColor("Green")
            .setDescription(
              `# Ticket Tool ${process.env.FREE}\nis a built-in support system designed to help your community handle requests efficiently. With just a button click, members can open a private support channel where staff can respond directly.`
            )
            .addFields(
              {
                name: `Commands Usage`,
                value: `- setup : setup the ticket panel\n- claimrole : set role to claim the ticket\n- pendingcategory #categoryId : set pending ticket to a category\n- activecategory #categoryId : set active ticket to a category\n- closedcategory #categoryId : set closed ticket into a category\n- transcript #channel : set a channel transcript logs`,
              },
              {
                name: `Premium Command Usage ${process.env.PREMIUM}`,
                value: `- oncreate {message} : custom message when someone create a ticket\n- oncliam {message} : custom message when staff claim ticket\n- onclose {message} : custom message when someone close the ticket`,
              },
              {
                name: `Placeholder Message`,
                value: `{ticket_owner} : someniceowner#000\n{ticket_claimer} : staffmember#0000`,
              }
            );

          return message.reply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error(error);
      await message.channe.send(`something went wrong try again later.`);
    }
  },
};

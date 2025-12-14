const {
  MessageFlags,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const Servers = require("../models/servers");

module.exports = {
  async execute(interaction) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: interaction.guild.id,
      });
      if (!serverProfile) return;

      switch (interaction.customId) {
        case "create_ticket": {
          await interaction.reply({
            content: `🎫 Creating your ticket...`,
            flags: MessageFlags.Ephemeral,
          });

          const pendingCategoryId = serverProfile.tickets.pendingTicketCategory;
          const pendingCategory =
            interaction.guild.channels.cache.get(pendingCategoryId);
          const parentId =
            pendingCategory?.type === ChannelType.GuildCategory
              ? pendingCategory.id
              : undefined;

          async function generateUniqueTicketId(serverId) {
            let ticketId;
            let exists = true;
            while (exists) {
              ticketId = Math.floor(1000 + Math.random() * 9000).toString();
              const existingTicket = await Servers.findOne({
                serverId,
                "tickets.users.ticketId": ticketId,
              });
              exists = !!existingTicket;
            }
            return ticketId;
          }

          const uniqueId = await generateUniqueTicketId(interaction.guild.id);

          const guildChannelIds = [...interaction.guild.channels.cache.keys()]; // all existing channel IDs in the guild

          await Servers.updateOne(
            { serverId: interaction.guild.id },
            {
              $pull: {
                "tickets.users": {
                  channelId: { $nin: guildChannelIds }, // remove tickets whose channelId no longer exists
                },
              },
            }
          );

          const updated = await Servers.findOneAndUpdate(
            {
              serverId: interaction.guild.id,
              // Only push if the user has no pending/claimed ticket whose channel still exists
              "tickets.users": {
                $not: {
                  $elemMatch: {
                    createdBy: interaction.user.id,
                    status: { $in: ["pending", "active"] },
                    channelId: { $in: guildChannelIds }, // only consider tickets whose channel exists
                  },
                },
              },
            },
            {
              $push: {
                "tickets.users": {
                  createdBy: interaction.user.id,
                  ticketId: uniqueId,
                  channelId: null, // will set after creating the channel
                  status: "pending",
                  createdAt: new Date(),
                },
              },
            },
            { new: true }
          );

          if (!updated) {
            return interaction.editReply({
              content: `⚠️ You already have an active ticket! Please close it before creating a new one.`,
              flags: MessageFlags.Ephemeral,
            });
          }

          // Ticket channel creation
          const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${uniqueId}`,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
              // Claim role permission: view but cannot send
              ...(serverProfile.tickets.claimRoles?.map((roleId) => ({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel],
                deny: [PermissionsBitField.Flags.SendMessages],
              })) || []),
            ],
          });

          // Update the ticket in DB with the actual channelId
          await Servers.updateOne(
            {
              serverId: interaction.guild.id,
              "tickets.users.ticketId": uniqueId,
            },
            {
              $set: {
                "tickets.users.$.channelId": ticketChannel.id,
              },
            }
          );

          // Custom welcome message + claim button
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`claim_ticket_${uniqueId}`)
              .setLabel("Claim Ticket")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setLabel("Close Ticket")
              .setCustomId(`close_ticket_${uniqueId}`)
              .setStyle(ButtonStyle.Danger)
          );

          let ticketContentMessage;

          if (serverProfile.premium?.isEnable) {
            // Premium: allow custom message
            ticketContentMessage =
              serverProfile.tickets.onCreateMessage ||
              `🎫 Hello ${interaction.user}, a staff member will assist you shortly!`;
          } else {
            // Free: always use default
            ticketContentMessage = `🎫 Hello ${interaction.user}, a staff member will assist you shortly!`;
          }

          const embed = new EmbedBuilder()
            .setDescription(ticketContentMessage)
            .setTitle(`Welcome to Ticket #${uniqueId}`);

          // Add branding only for non-premium servers
          if (!serverProfile.premium?.isEnable) {
            embed.setFooter({ text: `Powered by BeetleBot.dev` });
          }

          await ticketChannel.send({
            embeds: [embed],
            components: [row],
          });

          await interaction.editReply({
            content: `✅ Ticket created: ${ticketChannel}`,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }
      }
    } catch (err) {
      console.error("Ticket creation error:", err);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Failed to create ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};

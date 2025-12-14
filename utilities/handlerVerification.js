const {
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Servers = require("../models/servers");
const verificationToken = require("../models/verificationToken");

module.exports = {
  async execute(interaction) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: interaction.guild.id,
      });

      if (!serverProfile) {
        return interaction.reply({
          content: "⚠️ Server profile not found. Please contact an admin.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!serverProfile.verification.enabled) {
        return interaction.reply({
          content: "⚠️ Verification is not enabled on this server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // verification.roles is an array of role IDs
      const targetRoleIds = serverProfile.verification.roles || [];
      if (!targetRoleIds.length) {
        return interaction.reply({
          content: "⚠️ No verification roles are configured for this server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const member = interaction.member;

      // Filter valid roles from guild cache
      const validRoles = targetRoleIds.filter((id) =>
        interaction.guild.roles.cache.has(id)
      );

      if (!validRoles.length) {
        return interaction.reply({
          content: "⚠️ The configured verification roles no longer exist.",
          flags: MessageFlags.Ephemeral,
        });
      }

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
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        secretToken: secretToken,
      });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Verify Here")
          .setStyle("Link")
          .setURL(
            `http://localhost:3000/verify?userId=${interaction.user.id}&guildId=${interaction.guild.id}&token=${secretToken}`
          )
      );

      await interaction.reply({
        content: "✅ A verification link has been sent to you via DM.",
        flags: MessageFlags.Ephemeral,
      });
      await member.send({
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
      console.error("Error handling verification interaction:", error);
    }
  },
};

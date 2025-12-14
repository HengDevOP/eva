// utils/logCase.js
const { EmbedBuilder } = require("discord.js");
const Moderation = require("../models/moderationSchema");

/**
 * Create case log + send to log channel if available
 * @param {Client} client
 * @param {Guild} guild
 * @param {Object} caseData
 * @returns {Number} caseId
 */
async function logCase(client, guild, caseData) {
  let server = await Moderation.findOne({ serverId: guild.id });

  if (!server) server = new Moderation({ serverId: guild.id, cases: [] });

  const caseId = (server.cases.at(-1)?.caseId || 0) + 1;
  caseData.caseId = caseId;
  caseData.createdAt = new Date();

  server.cases.push(caseData);
  await server.save();

  // =============================
  //  Send log if logChannel exists
  // =============================
  if (server.logChannel) {
    const logChannel = guild.channels.cache.get(server.logChannel);
    const embed = new EmbedBuilder().setTitle(
      `📁 ${caseData.action} | Case #${caseId}`
    );
    if (logChannel) {
      embed
        .setColor(caseData.action === "BAN" ? "Red" : "Yellow")
        .addFields(
          {
            name: "👤 Target",
            value: `${caseData.targetTag} (${caseData.targetId})`,
          },
          { name: "🔨 Moderator", value: `${caseData.moderatorTag}` },
          { name: "📄 Reason", value: caseData.reason }
        )
        .setTimestamp();

      switch (caseData.action) {
        case "BAN": {
          embed.setColor("Red");
          break;
        }
        case "UNBAN": {
          embed.setColor("Green");
          break;
        }
        case "TEMPBAN": {
          embed.setColor("Orange").addFields({
            name: "⏲ Duration",
            value: caseData.duration || "N/A",
          });
          break;
        }
        case "TIMEOUT": {
          embed.setColor("Orange").addFields({
            name: "⏲ Duration",
            value: caseData.duration || "N/A",
          });
          break;
        }
      }
      logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  return caseId;
}

module.exports = logCase;

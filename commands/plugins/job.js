const { EmbedBuilder } = require("discord.js");
const Servers = require("../../models/servers");
const { memberPermissions } = require("../../utilities/permissions");

module.exports = {
  name: "job",
  description: "config or do the work stuff",
  usage: "!job",
  alias: ["job"],
  category: ["Plugins"],
  async execute(message, args) {
    try {
      const serverProfile = await Servers.findOne({
        serverId: message.guild.id,
      });
      if (!serverProfile) return;
      const action = args[0]?.toLowerCase();
      switch (action) {
        case "create": {
          if (!memberPermissions(message)) return;

          const jobLengths = serverProfile.currency.work.jobs.length;
          if (!serverProfile.premium.isEnable) {
            if (jobLengths >= 3) {
              return message.channel.send(
                `${icon} You have reached the maximum of creating job.`
              );
            }
          }

          const questions = [
            "👔 What is the job title? (e.g., `Cashier`, `Programmer`)",
            "💰 What is the payout amount? (e.g., `100`, `500`)",
            "📝 What is the work message? (e.g., `You worked as a Cashier and earned 100 coins!`)",
            "🔧 (Optional) Mention roles that can access this job. Separate multiple roles with spaces. Type `none` for no role restriction.",
          ];

          let step = 0;
          let title,
            payout,
            messageText,
            accessRoles = [];

          const filter = (m) => m.author.id === message.author.id;
          const collector = message.channel.createMessageCollector({
            filter,
            time: 300000, // 5 minutes
          });

          await message.channel.send(questions[step]);

          collector.on("collect", async (m) => {
            if (step === 0) {
              title = m.content.trim();
              if (!title.length) {
                return m.channel.send(
                  "❌ Job title cannot be empty. Try again."
                );
              }
            }

            if (step === 1) {
              payout = parseInt(m.content, 10);
              if (isNaN(payout) || payout <= 0) {
                return m.channel.send(
                  "❌ Invalid payout. Please enter a positive number."
                );
              }
            }

            if (step === 2) {
              messageText = m.content.trim();
              if (!messageText.length) {
                return m.channel.send(
                  "❌ Work message cannot be empty. Try again."
                );
              }
            }

            if (step === 3) {
              if (m.content.toLowerCase() !== "none") {
                const roles = m.mentions.roles;
                if (roles.size > 0) {
                  accessRoles = roles.map((r) => r.id);
                } else {
                  return m.channel.send(
                    "❌ Invalid roles mentioned. Please mention valid roles or type `none`."
                  );
                }
              }

              // Save job to DB
              serverProfile.currency.work.jobs.push({
                enabled: true,
                title,
                payout,
                message: messageText,
                accessRoles,
              });

              await serverProfile.save();

              m.channel.send(
                `✅ Job **${title}** created successfully!\n💰 Payout: \`${payout}\`\n📝 Message: "${messageText}"\n🔧 Role Restriction: ${
                  accessRoles.length
                    ? accessRoles.map((id) => `<@&${id}>`).join(", ")
                    : "None"
                }`
              );

              collector.stop();
            }

            step++;
            if (step < questions.length) {
              m.channel.send(questions[step]);
            }
          });

          collector.on("end", (_, reason) => {
            if (reason === "time") {
              message.channel.send(
                "⌛ Job creation timed out. Please try again."
              );
            }
          });

          break;
        }
        case "delete": {
        }

        case "info": {
          const embed = new EmbedBuilder()
            .setDescription(`# Job`)
            .setThumbnail(
              "https://cdn-icons-png.flaticon.com/128/1436/1436690.png"
            )
            .addFields({
              name: `Required Plugins`,
              value: `Currency`,
              inline: true,
            });
          return message.channel.send({ embeds: [embed] });
        }

        default: {
        }
      }
    } catch (error) {
      console.error(error);
      await message.reply(`there was an error executing the work command.`);
    }
  },
};

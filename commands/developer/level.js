// commands/level.js
const { createCanvas, loadImage } = require("canvas");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "l",
  alias: ["rank"],
  async execute(message, args) {
    try {
      if (!message.guild) return;

      let userData = { level: 1, exp: 30 };
      const requiredExp = Math.floor(100 * Math.pow(1.5, userData.level - 1));
      const currentExp = userData.exp || 0;
      const progress = Math.max(0, Math.min(1, currentExp / requiredExp));

      const width = 300;
      const height = 100;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Detect background
      let bgURL = message.attachments.first()?.url || args[0] || null;

      if (bgURL) {
        try {
          const bg = await loadImage(bgURL);
          ctx.drawImage(bg, 0, 0, width, height);
        } catch {
          drawDefaultBG(ctx, width, height);
        }
      } else {
        drawDefaultBG(ctx, width, height);
      }

      // Outer glow card
      const padding = 8;
      roundRect(
        ctx,
        padding,
        padding,
        width - padding * 2,
        height - padding * 2,
        8
      );
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();

      // Avatar
      const avatarSize = 46;
      const avatarX = padding + 18 + avatarSize / 2;
      const avatarY = height / 2;

      try {
        const avatarURL = message.author.displayAvatarURL({
          extension: "png",
          size: 256,
        });
        const avatar = await loadImage(avatarURL);

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          avatar,
          avatarX - avatarSize / 2,
          avatarY - avatarSize / 2,
          avatarSize,
          avatarSize
        );
        ctx.restore();

        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2 + 2, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.stroke();
      } catch {}

      // Text + Progress Bar
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = "700 12px Sans";
      ctx.fillText(
        `${message.author.username}`,
        padding + avatarSize + 28,
        avatarY - 14
      );

      ctx.font = "700 16px Sans";
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`Lv ${userData.level}`, width - padding - 6, avatarY - 14);

      ctx.textAlign = "left";
      ctx.font = "400 10px Sans";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(
        `EXP: ${numberWithCommas(currentExp)} / ${numberWithCommas(
          requiredExp
        )}`,
        padding + avatarSize + 28,
        avatarY + 2
      );

      const barWidth = width - (padding * 2 + avatarSize + 40);
      const barHeight = 10;
      const barX = padding + avatarSize + 28;
      const barY = avatarY + 14;

      roundRect(ctx, barX, barY, barWidth, barHeight, 6);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();

      const fillW = Math.max(4, Math.floor(barWidth * progress));
      roundRect(ctx, barX, barY, fillW, barHeight, 6);
      ctx.fillStyle = "#00c982";
      ctx.fill();

      ctx.font = "600 9px Sans";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "right";
      ctx.fillText(
        `${Math.floor(progress * 100)}%`,
        barX + barWidth - 4,
        barY + barHeight - 2
      );

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });
      const embed = new EmbedBuilder().setImage("attachment://rank.png");

      await message.channel.send({ files: [attachment] });
    } catch (err) {
      console.error(err);
      message.channel.send("❌ Failed to generate rank card.");
    }
  },
};

// default gradient bg
function drawDefaultBG(ctx, width, height) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "rgba(255,255,255,0.04)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

// round corners
function roundRect(ctx, x, y, w, h, r) {
  const radius = r || 6;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function numberWithCommas(x) {
  return Number(x || 0).toLocaleString();
}

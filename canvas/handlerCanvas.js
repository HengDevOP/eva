const { createCanvas, loadImage } = require("canvas");

async function drawProfileCard({
  username,
  discriminator,
  avatarURL,
  message = "Welcome!",
  bgURL = "https://png.pngtree.com/background/20210710/original/pngtree-red-festive-stepped-welcome-new-year-party-background-picture-image_979186.jpg",
  width = 300,
  height = 150,
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background image if provided
  if (bgURL) {
    try {
      const bg = await loadImage(bgURL);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (err) {
      console.warn("Failed to load background:", err.message);
      ctx.fillStyle = "#0F172A"; // fallback color
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, width, height);
  }

  // Add semi-transparent black overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)"; // 35% black
  ctx.fillRect(0, 0, width, height);

  // Card
  const cardW = width - 20;
  const cardH = height - 20;
  const cardX = 10;
  const cardY = 10;

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);

  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avatar
  const avatarSize = cardH * 0.8;
  const avatarX = cardX + 8;
  const avatarY = cardY + (cardH - avatarSize) / 2;

  try {
    const avatar = await loadImage(avatarURL);
    ctx.save();
    roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 20);
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 3;
    roundRect(
      ctx,
      avatarX - 2,
      avatarY - 2,
      avatarSize + 4,
      avatarSize + 4,
      20
    );
    ctx.stroke();
  } catch {}

  // Text block position (centered vertically next to avatar)
  const textX = avatarX + avatarSize + 10;
  const textHeight = 22 + 18; // Welcome! + username line spacing
  const textStartY = avatarY + avatarSize / 2 - textHeight / 2 + 14; // adjust baseline

  // Line 1: Welcome!
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.max(14, avatarSize * 0.23)}px Sans`;
  ctx.fillText(message, textX, textStartY);

  // Line 2: Username
  const usernameText = `${username}#${discriminator}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `400 ${Math.max(12, avatarSize * 0.19)}px Sans`;
  ctx.fillText(usernameText, textX, textStartY + 22);

  return canvas.toBuffer("image/png");
}

module.exports = drawProfileCard;

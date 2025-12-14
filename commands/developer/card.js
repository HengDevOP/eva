// utilities/generatePixelCard.js
const { createCanvas, loadImage } = require("canvas");

/**
 * Generate a pixel-art credit card PNG buffer.
 * @param {Object} opts
 * @param {string} opts.username - display name (e.g. "HoChen")
 * @param {number} opts.balance - main balance (number)
 * @param {number} opts.bank - bank balance (number)
 * @param {Object} [opts.options] - optional settings
 * @param {number} [opts.options.width=320]
 * @param {number} [opts.options.height=180]
 * @param {string} [opts.options.cardColor="#1e293b"]
 * @param {string} [opts.options.accent="#00c982"]
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generatePixelCard(
  {
    username = "Player",
    balance = 0,
    bank = 0,
    userId = "000000000000000000",
  } = {},
  options = {}
) {
  const width = options.width || 320;
  const height = options.height || 180;

  const pixelSize =
    options.pixelSize || Math.max(2, Math.floor(Math.min(width, height) / 80));
  const cardColor = options.cardColor || "#0f172a";
  const accent = options.accent || "#ffd166";
  const textColor = options.textColor || "#ffffff";

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Helper to draw a "pixel"
  function px(x, y, w = 1, h = 1, color = "#000") {
    ctx.fillStyle = color;
    ctx.fillRect(x * pixelSize, y * pixelSize, w * pixelSize, h * pixelSize);
  }

  // ---------- Background ----------
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, width, height);

  // ---------- Card Base ----------
  const marginX = 16;
  const marginY = 14;
  const cardW = Math.floor((width - marginX * 2) / pixelSize);
  const cardH = Math.floor((height - marginY * 2) / pixelSize);
  const cardX = Math.floor(marginX / pixelSize);
  const cardY = Math.floor(marginY / pixelSize);

  for (let y = 0; y < cardH; y++) {
    for (let x = 0; x < cardW; x++) {
      const isBorder = x === 0 || y === 0 || x === cardW - 1 || y === cardH - 1;
      px(cardX + x, cardY + y, 1, 1, isBorder ? "#081226" : cardColor);
    }
  }

  // ---------- Accent Stripe ----------
  for (let x = 2; x < Math.min(12, cardW - 2); x += 2) {
    for (let y = 2; y < 6; y++) {
      px(cardX + x, cardY + y, 1, 1, accent);
    }
  }

  // ---------- Chip ----------
  const chipX = cardX + 3;
  const chipY = cardY + 8;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 6; x++) {
      const col = (x + y) % 2 === 0 ? "#f5f3c7" : "#d4c35a";
      px(chipX + x, chipY + y, 1, 1, col);
    }
  }

  // ---------- Issuer ----------
  drawPixelTextRight(
    cardX + cardW - 12,
    cardY + 4,
    "BEETLE BANK",
    1,
    ctx,
    pixelSize,
    textColor
  );

  // ---------- Card Number (use user ID) ----------
  const idStr = String(userId || "000000000000000000"); // 18 digits
  // format: XXXX XXXXX XXXXX XXXX
  const cardNumberFormatted =
    idStr.slice(0, 4) +
    " " +
    idStr.slice(4, 9) +
    " " +
    idStr.slice(9, 14) +
    " " +
    idStr.slice(14, 18);

  drawPixelText(
    cardX + 3,
    chipY + 6,
    cardNumberFormatted,
    1,
    ctx,
    pixelSize,
    textColor
  );

  // ---------- Bottom-left: username + balances with icons ----------
  const leftMargin = 6;
  const bottomMargin = 14;

  // Username above balances
  drawPixelText(
    cardX + leftMargin,
    cardY + cardH - bottomMargin - 20,
    username.toUpperCase(),
    1,
    ctx,
    pixelSize,
    "#e6eef8"
  );

  // Coin icon
  function drawCoinIcon(x, y) {
    const coinColor = "#ffd700";
    const border = "#b8860b";
    px(x, y, 1, 1, border);
    px(x + 1, y, 1, 1, coinColor);
    px(x + 2, y, 1, 1, border);
    px(x, y + 1, 1, 1, coinColor);
    px(x + 1, y + 1, 1, 1, coinColor);
    px(x + 2, y + 1, 1, 1, coinColor);
    px(x, y + 2, 1, 1, border);
    px(x + 1, y + 2, 1, 1, coinColor);
    px(x + 2, y + 2, 1, 1, border);
  }

  // Bank icon
  function drawBankIcon(x, y) {
    const building = "#0ea5a4";
    const roof = "#028484";
    px(x, y, 3, 1, roof); // roof
    px(x, y + 1, 3, 1, building); // building
    px(x + 1, y + 2, 1, 1, building); // door
  }

  // Coin icon and MAIN balance
  const mainX = cardX + leftMargin;
  const mainY = cardY + cardH - bottomMargin - 10;
  drawCoinIcon(mainX, mainY);
  drawPixelText(
    mainX + 5, // more space from icon
    mainY,
    formatNumber(balance),
    0.9,
    ctx,
    pixelSize,
    "#dfffe7"
  );

  // Bank icon and BANK balance
  const bankX = cardX + leftMargin;
  const bankY = mainY + 12; // 12 pixels down from MAIN for spacing
  drawBankIcon(bankX, bankY);
  drawPixelText(
    bankX + 5, // more space from icon
    bankY,
    formatNumber(bank),
    0.9,
    ctx,
    pixelSize,
    "#fff7d1"
  );

  // ---------- Helpers ----------
  function drawPixelText(
    x,
    y,
    text,
    scale = 1,
    ctxLocal = ctx,
    pSize = pixelSize,
    color = "#fff"
  ) {
    const glyphs = getGlyphs();
    let cursorX = x;
    for (const ch of String(text).toUpperCase()) {
      const glyph = glyphs[ch] || glyphs[" "];
      for (let gy = 0; gy < glyph.length; gy++) {
        for (let gx = 0; gx < glyph[gy].length; gx++) {
          if (glyph[gy][gx] === "1") {
            ctxLocal.fillStyle = color;
            ctxLocal.fillRect(
              Math.floor((cursorX + gx * scale) * pSize),
              Math.floor((y + gy * scale) * pSize),
              Math.max(1, Math.floor(pSize * scale)),
              Math.max(1, Math.floor(pSize * scale))
            );
          }
        }
      }
      cursorX += (glyph[0].length + 1) * scale;
    }
  }

  function drawPixelTextRight(
    x,
    y,
    text,
    scale = 1,
    ctxLocal = ctx,
    pSize = pixelSize,
    color = "#fff"
  ) {
    const glyphs = getGlyphs();
    let w = 0;
    for (const ch of String(text).toUpperCase()) {
      const glyph = glyphs[ch] || glyphs[" "];
      w += (glyph[0].length + 1) * scale;
    }
    drawPixelText(x - Math.ceil(w), y, text, scale, ctxLocal, pSize, color);
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function getGlyphs() {
    return {
      " ": ["00000", "00000", "00000", "00000", "00000"],
      0: ["01110", "10001", "10001", "10001", "01110"],
      1: ["00100", "01100", "00100", "00100", "01110"],
      2: ["01110", "10001", "00110", "01000", "11111"],
      3: ["01110", "10001", "00110", "10001", "01110"],
      4: ["00010", "00110", "01010", "11111", "00010"],
      5: ["11111", "10000", "11110", "00001", "11110"],
      6: ["01110", "10000", "11110", "10001", "01110"],
      7: ["11111", "00001", "00010", "00100", "00100"],
      8: ["01110", "10001", "01110", "10001", "01110"],
      9: ["01110", "10001", "01111", "00001", "01110"],
      A: ["01110", "10001", "11111", "10001", "10001"],
      B: ["11110", "10001", "11110", "10001", "11110"],
      C: ["01111", "10000", "10000", "10000", "01111"],
      D: ["11110", "10001", "10001", "10001", "11110"],
      E: ["11111", "10000", "11110", "10000", "11111"],
      F: ["11111", "10000", "11110", "10000", "10000"],
      G: ["01111", "10000", "10011", "10001", "01110"],
      H: ["10001", "10001", "11111", "10001", "10001"],
      I: ["01110", "00100", "00100", "00100", "01110"],
      J: ["00111", "00010", "00010", "10010", "01100"],
      K: ["10001", "10010", "11100", "10010", "10001"],
      L: ["10000", "10000", "10000", "10000", "11111"],
      M: ["10001", "11011", "10101", "10001", "10001"],
      N: ["10001", "11001", "10101", "10011", "10001"],
      P: ["11110", "10001", "11110", "10000", "10000"],
      R: ["11110", "10001", "11110", "10010", "10001"],
      S: ["01111", "10000", "01110", "00001", "11110"],
      T: ["11111", "00100", "00100", "00100", "00100"],
      ".": ["00000", "00000", "00000", "00110", "00110"],
      ":": ["00000", "00110", "00000", "00110", "00000"],
      ",": ["00000", "00000", "00000", "00110", "00100"],
      "/": ["00001", "00010", "00100", "01000", "10000"],
      "-": ["00000", "00000", "11111", "00000", "00000"],
    };
  }

  return canvas.toBuffer("image/png");
}

module.exports = generatePixelCard;

const { AttachmentBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "card",
  async execute(message, args) {
    const userData = {
      balance: 200,
      bank: 50000,
      username: message.author.username,
      userId: message.author.id,
    };
    try {
      const buffer = await generatePixelCard({
        username: userData.username,
        balance: userData.balance,
        bank: userData.bank,
        userId: message.author.id,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "pixelcard.png",
      });
      const embed = new EmbedBuilder().setImage("attachment://pixelcard.png");

      await message.channel.send({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error(err);
      message.channel.send("Failed to generate pixel card.");
    }
  },
};

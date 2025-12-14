const mongoose = require("mongoose");

const giftcodeSchema = new mongoose.Schema({
  purchaserId: { type: String, required: true },
  code: { type: String, required: true },
  purchasedAt: { type: Date, required: true },
  redeemAt: { type: Date },
  redeemBy: { type: String },
  redeemGuild: { type: String },
  redeemGuildName: { type: String },
  redeemGuildOwner: { type: String },
});

module.exports = mongoose.model("GiftCode", giftcodeSchema);

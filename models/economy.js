const mongoose = require("mongoose");

const economySchema = new mongoose.Schema({
  serverId: { type: String, required: true },
  icon: { type: String, default: "💰" },
  users: [
    {
      id: { type: String, required: true },
      balance: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
      bank: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
      dailySent: { type: Number, default: 0 },
      lastTransfer: { type: String, default: "0" },
    },
  ],
});

module.exports = mongoose.model("Economy", economySchema);

const mongoose = require("mongoose");

const actionEnum = [
  "WARN",
  "MUTE",
  "KICK",
  "BAN",
  "UNBAN",
  "TIMEOUT",
  "NOTE",
  "TEMPBAN",
];

const caseSchema = new mongoose.Schema({
  caseId: { type: Number, required: true }, // Increment per guild
  action: { type: String, enum: actionEnum, required: true },

  moderatorId: { type: String, required: true },
  moderatorTag: { type: String },

  targetId: { type: String, required: true },
  targetTag: { type: String },

  reason: { type: String, default: "No reason provided" },

  duration: { type: String, default: null }, // "10m", "7d", null = permanent
  expireAt: { type: Date, default: null },

  proof: { type: String, default: null }, // Image/message URL
  notes: { type: String, default: "" },

  status: {
    type: String,
    enum: ["active", "expired", "reversed"],
    default: "active",
  },

  createdAt: { type: Date, default: Date.now },
});

const moderationSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },

  logChannel: { type: String, default: null }, // << Only one log channel

  cases: [caseSchema], // Moderation history

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Moderation", moderationSchema);

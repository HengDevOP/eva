const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema({
  caseId: { type: Number, required: true }, // Auto increment per guild
  action: {
    // Warn/Mute/Ban etc.
    type: String,
    enum: ["WARN", "MUTE", "KICK", "BAN", "UNBAN", "TIMEOUT"],
    required: true,
  },
  moderatorId: { type: String, required: true }, // Who punished
  moderatorTag: { type: String }, // Snapshot username#0000
  targetId: { type: String, required: true }, // Punished user
  targetTag: { type: String }, // Snapshot target username
  reason: { type: String, default: "No reason provided" },

  duration: { type: String, default: null }, // Example "30m" / "7d"
  expireAt: { type: Date, default: null }, // For temporary punishments

  proof: { type: String, default: null }, // Image/Message URL
  notes: { type: String, default: "" },

  status: {
    type: String,
    enum: ["active", "expired", "reversed"],
    default: "active",
  },

  createdAt: { type: Date, default: Date.now },
});

const loggerSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },

  // logging channels
  memberEvent: { type: String, default: null },
  messageEvent: { type: String, default: null },
  guildEvent: { type: String, default: null },
  channelEvent: { type: String, default: null },
  voiceEvent: { type: String, default: null },
  roleEvent: { type: String, default: null },
  inviteEvent: { type: String, default: null },
  emojiEvent: { type: String, default: null },

  // Moderation case logs
  cases: [caseSchema],
});

module.exports = mongoose.model("Logger", loggerSchema);

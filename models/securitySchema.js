const mongoose = require("mongoose");

const securitySchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },
  enabled: { type: String, default: true },
  whitelist: [
    {
      id: { type: String },
    },
  ],
  // system protector features
  antiInviteCreate: { type: Boolean, default: true },
  antiChannelCreate: { type: Boolean, default: true },
  antiRoleCreate: { type: Boolean, default: true },
  antiWebhookDelete: { type: Boolean, default: true },
  antiEmojiUpdate: { type: Boolean, default: true },
  antiWebhookUpdate: { type: Boolean, default: true },
  antiServerUpdate: { type: Boolean, default: true },
  antiNicknameChange: { type: Boolean, default: true },
  antiMassMention: { type: Boolean, default: true },
  antiBotSpam: { type: Boolean, default: true },
  antiBotBan: { type: Boolean, default: true },
  antiChannelOverwrite: { type: Boolean, default: true },
  antiTimedMuteAbuse: { type: Boolean, default: true },
});

module.exports = mongoose.model("Security", securitySchema);

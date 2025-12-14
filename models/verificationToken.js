const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  secretToken: { type: String, required: true, unique: true },
  expiredAt: { type: Number, default: Date.now() + 10 * 60 * 1000 }, // Token expires after 10 minutes
});

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);

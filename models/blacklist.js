const mongoose = require("mongoose");

const blacklistGuildSchema = new mongoose.Schema({
  blacklist: {
    type: [String], // array of string IDs
    default: [],
  },
});

module.exports = mongoose.model("BlacklistGuild", blacklistGuildSchema);

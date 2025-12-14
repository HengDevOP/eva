const mongoose = require("mongoose");

const tempvoiceSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },
  panel: [
    {
      panelChannel: { type: String, required: true },
      categoryChannel: { type: String },
      customName: { type: Boolean, default: false },
      tempChannelName: { type: String },
      tempChannels: [
        {
          userId: { type: String, required: true },
          channelName: { type: String },
          timestamp: { type: Number },
          privacy: { type: Boolean, default: true },
          visible: { type: Boolean, default: true },
          password: { type: String },
          trusted: [{ userId: { type: String } }],
          blocked: [
            {
              userId: { type: String },
            },
          ],
        },
      ],
    },
  ],
});

module.exports = mongoose.model("TempVoice", tempvoiceSchema);

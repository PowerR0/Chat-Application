const mongoose = require("mongoose");
const { memoryUsage } = require("process");

const GroupChatSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
    min: 1,
    max: 20,
  },
  background_image: {
    type: String,
    default: "",
  },
  members: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    required: true,
    validate: {
      validator: function (value) {
        return Array.isArray(value) && value.length > 0;
      },
      message: "A group must have at least one member.",
    },
  },
});

module.exports = mongoose.model("GroupChat", GroupChatSchema);

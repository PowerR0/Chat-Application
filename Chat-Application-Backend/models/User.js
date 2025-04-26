const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    minLength: 1,
    maxLength: 20,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    minLength: 1,
    maxLength: 20,
    required: true,
  },
  profile_image: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("User", UserSchema);

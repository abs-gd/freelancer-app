const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twoFASecret: { type: String, default: null },
  isTwoFAEnabled: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", UserSchema);

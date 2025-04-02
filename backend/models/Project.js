const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  color: { type: String, default: "#ffffff" }, // UI color
  note: {
    type: Object,
    default: { time: Date.now(), blocks: [], version: "2.27.0" },
  },
  isActive: { type: Boolean, default: false }, // Tracks if this project is currently active
  projectHistory: [{ timestamp: Date }], // Log of project switching times
});

module.exports = mongoose.model("Project", ProjectSchema);

const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  title: { type: String, required: true },
  category: { type: String, required: true },
  content: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Note", NoteSchema);

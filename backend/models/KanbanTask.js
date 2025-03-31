const mongoose = require("mongoose");

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
});

const KanbanTaskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  title: { type: String, required: true },
  status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
  subtasks: [SubtaskSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("KanbanTask", KanbanTaskSchema);

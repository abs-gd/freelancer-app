const mongoose = require("mongoose");

const DailyTaskSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  title: String,
  completions: [
    {
      date: String,
      done: Boolean,
    },
  ],
});

module.exports = mongoose.model("DailyTask", DailyTaskSchema);

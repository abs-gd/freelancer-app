const mongoose = require("mongoose");

const IncomeSchema = new mongoose.Schema({
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  site_or_stream: { type: String, required: true },
  product: { type: String, required: true },
});

module.exports = mongoose.model("Income", IncomeSchema);

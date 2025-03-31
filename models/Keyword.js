const mongoose = require("mongoose")
const Schema = mongoose.Schema

const KeywordSchema = new Schema({
  word: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["bola", "shadow", "api", "custom", "Custom"],
    default: "Custom",
  },
  company: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Keyword", KeywordSchema)


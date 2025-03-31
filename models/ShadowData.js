const mongoose = require("mongoose")
const Schema = mongoose.Schema

const ShadowDataSchema = new Schema({
  dataType: {
    type: String,
    enum: ["PII", "Financial", "Credentials", "API Key", "Token", "Encoded", "Hash", "Other"],
    required: true,
  },
  pattern: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  location: {
    file: String,
    line: Number,
    context: String,
  },
  sample: String,
  entropy: Number,
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  scanId: {
    type: Schema.Types.ObjectId,
    ref: "Report",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("ShadowData", ShadowDataSchema)


const mongoose = require("mongoose")
const Schema = mongoose.Schema

const ApiEndpointSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    required: true,
  },
  parameters: [
    {
      name: String,
      type: String,
      required: Boolean,
      description: String,
    },
  ],
  headers: [
    {
      name: String,
      value: String,
    },
  ],
  authType: {
    type: String,
    enum: ["None", "Basic", "Bearer", "API Key", "OAuth", "Custom"],
    default: "None",
  },
  description: String,
  tags: [String],
  company: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  vulnerabilities: [
    {
      type: {
        type: String,
        required: true,
      },
      severity: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        required: true,
      },
      description: String,
      remediation: String,
      detectedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  lastTested: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("ApiEndpoint", ApiEndpointSchema)


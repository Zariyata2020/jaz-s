const mongoose = require("mongoose")
const Schema = mongoose.Schema

const ReportSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  scanType: {
    type: String,
    required: true,
  },
  findings: [
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
      description: {
        type: String,
        required: true,
      },
      location: {
        type: String,
        required: true,
      },
    },
  ],
  summary: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  company: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Report", ReportSchema)


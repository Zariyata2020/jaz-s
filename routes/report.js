const express = require("express")
const router = express.Router()
const Report = require("../models/Report")

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  res.status(401).json({ message: "Unauthorized" })
}

// Get all reports for company
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const reports = await Report.find({ company: req.session.user.company }).sort({ createdAt: -1 })
    res.json(reports)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Get single report
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)

    // Check if report exists
    if (!report) {
      return res.status(404).json({ message: "Report not found" })
    }

    // Check if user has permission
    if (report.company !== req.session.user.company) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    res.json(report)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete report
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)

    // Check if report exists
    if (!report) {
      return res.status(404).json({ message: "Report not found" })
    }

    // Check if user has permission
    if (report.company !== req.session.user.company) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    await report.remove()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router


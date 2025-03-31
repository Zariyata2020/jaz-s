const express = require("express")
const router = express.Router()
const Keyword = require("../models/Keyword")

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  res.status(401).json({ message: "Unauthorized" })
}

// Get all keywords for company
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const keywords = await Keyword.find({ company: req.session.user.company })
    res.json(keywords)
  } catch (err) {
    console.error("Error fetching keywords:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Add new keyword
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { word, category } = req.body

    console.log("Adding keyword:", { word, category, user: req.session.user })

    // Validate required fields
    if (!word || word.trim() === "") {
      return res.status(400).json({ message: "Keyword is required" })
    }

    // Check if keyword already exists for this company
    const existingKeyword = await Keyword.findOne({
      word: word,
      company: req.session.user.company,
    })

    if (existingKeyword) {
      return res.status(400).json({ message: "Keyword already exists" })
    }

    // Normalize category to ensure it matches the enum values
    const normalizedCategory = category || "Custom"

    // Create new keyword
    const newKeyword = new Keyword({
      word,
      category: normalizedCategory,
      company: req.session.user.company,
      createdBy: req.session.user.id,
    })

    await newKeyword.save()
    res.json(newKeyword)
  } catch (err) {
    console.error("Error adding keyword:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Delete keyword
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const keyword = await Keyword.findById(req.params.id)

    // Check if keyword exists
    if (!keyword) {
      return res.status(404).json({ message: "Keyword not found" })
    }

    // Check if user has permission
    if (keyword.company !== req.session.user.company) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Use deleteOne instead of remove (which is deprecated)
    await Keyword.deleteOne({ _id: req.params.id })
    res.json({ success: true })
  } catch (err) {
    console.error("Error deleting keyword:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router


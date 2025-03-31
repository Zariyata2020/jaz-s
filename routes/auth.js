const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const User = require("../models/User")

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  res.status(401).json({ message: "Unauthorized" })
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, company } = req.body

    // Validate required fields
    if (!username || !email || !password || !company) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      company,
    })

    await newUser.save()

    // Set session
    req.session.user = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      company: newUser.company,
    }

    res.json({ success: true, user: req.session.user })
  } catch (err) {
    console.error("Registration error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Set session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      company: user.company,
    }

    res.json({ success: true, user: req.session.user })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out", error: err.message })
    }
    res.json({ success: true })
  })
})

// Update profile
router.put("/profile", isAuthenticated, async (req, res) => {
  try {
    const { username, email, company, password } = req.body
    const userId = req.session.user.id

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update fields
    if (username) user.username = username
    if (email) user.email = email
    if (company) user.company = company

    // Update password if provided
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)
    }

    await user.save()

    // Update session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      company: user.company,
    }

    res.json({ success: true, user: req.session.user })
  } catch (err) {
    console.error("Profile update error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Get current user
router.get("/me", isAuthenticated, (req, res) => {
  res.json({ user: req.session.user })
})

module.exports = router


const express = require("express")
const router = express.Router()

// Home page
router.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard")
  }
  res.render("index")
})

// Register page
router.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard")
  }
  res.render("register")
})

// Dashboard page
router.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/")
  }
  res.render("dashboard", { user: req.session.user })
})

// Settings page
router.get("/settings", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/")
  }
  res.render("settings", { user: req.session.user })
})

module.exports = router


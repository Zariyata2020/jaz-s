const express = require("express")
const router = express.Router()
const shadowDataController = require("../controllers/shadowData.controller")

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  res.status(401).json({ message: "Unauthorized" })
}

// Scan for shadow data
router.post("/scan", isAuthenticated, shadowDataController.scanForShadowData)

module.exports = router


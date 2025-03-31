const express = require("express")
const router = express.Router()

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  res.redirect("/")
}

// API Security page
router.get("/", isAuthenticated, (req, res) => {
  res.render("api-security", { user: req.session.user })
})

// API Endpoints route - this was missing
router.get("/endpoints", isAuthenticated, async (req, res) => {
  try {
    // Mock data for API endpoints
    const endpoints = [
      {
        id: "1",
        path: "/api/users",
        method: "GET",
        auth: "JWT",
        rateLimit: true,
        vulnerabilities: [],
      },
      {
        id: "2",
        path: "/api/products",
        method: "GET",
        auth: "None",
        rateLimit: false,
        vulnerabilities: [
          {
            type: "Missing Authentication",
            severity: "High",
            description: "This endpoint does not require authentication",
          },
        ],
      },
      {
        id: "3",
        path: "/api/orders",
        method: "POST",
        auth: "JWT",
        rateLimit: true,
        vulnerabilities: [],
      },
      {
        id: "4",
        path: "/api/settings",
        method: "PUT",
        auth: "Basic",
        rateLimit: false,
        vulnerabilities: [
          {
            type: "Insecure Authentication",
            severity: "Medium",
            description: "Using Basic Auth without HTTPS is insecure",
          },
          {
            type: "Missing Rate Limiting",
            severity: "Low",
            description: "No rate limiting could lead to abuse",
          },
        ],
      },
    ]

    res.json(endpoints)
  } catch (err) {
    console.error("Error fetching API endpoints:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// API Scan route
router.post("/scan", isAuthenticated, async (req, res) => {
  try {
    const { url, method, headers } = req.body

    if (!url) {
      return res.status(400).json({ message: "API URL is required" })
    }

    // Mock scan results
    const scanResults = {
      url,
      method: method || "GET",
      timestamp: new Date(),
      findings: [
        {
          type: "Missing Rate Limiting",
          severity: "Medium",
          description: "API endpoint does not implement rate limiting, which could lead to abuse",
        },
        {
          type: "Insecure Authentication",
          severity: "High",
          description: "API uses basic authentication without HTTPS",
        },
      ],
      recommendations: [
        "Implement rate limiting to prevent abuse",
        "Use JWT or OAuth for authentication",
        "Ensure all API communication is over HTTPS",
      ],
    }

    res.json({
      success: true,
      results: scanResults,
    })
  } catch (err) {
    console.error("API scan error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router


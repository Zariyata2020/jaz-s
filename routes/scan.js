const express = require("express")
const router = express.Router()
const Report = require("../models/Report")
const shadowDataDetector = require("../utils/shadowDataDetector")

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  res.status(401).json({ message: "Unauthorized" })
}

// BOLA scan
router.post("/bola", isAuthenticated, async (req, res) => {
  try {
    const { codeSnippet, fileType } = req.body

    if (!codeSnippet || !fileType) {
      return res.status(400).json({ message: "Code snippet and file type are required" })
    }

    // Perform BOLA scan (simplified for example)
    const findings = [
      {
        type: "Missing Authorization Check",
        description: "API endpoint does not verify user permissions before accessing data",
        severity: "High",
        location: "Line 15, Column 3",
      },
      {
        type: "Direct Object Reference",
        description: "User input is directly used to access database records without authorization checks",
        severity: "Critical",
        location: "Line 23, Column 12",
      },
    ]

    // Create report
    const report = new Report({
      title: "BOLA Scan",
      scanType: "bola",
      summary: "Detected 2 potential BOLA vulnerabilities. Critical issues found that require immediate attention.",
      findings,
      createdBy: req.session.user.id,
      company: req.session.user.company,
    })

    await report.save()

    res.json({
      success: true,
      report,
    })
  } catch (err) {
    console.error("BOLA scan error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// Shadow data scan
router.post("/shadow", isAuthenticated, async (req, res) => {
  try {
    const { codeSnippet, fileType } = req.body

    if (!codeSnippet || !fileType) {
      return res.status(400).json({ message: "Code snippet and file type are required" })
    }

    // Use our enhanced shadow data detector
    const { findings, metadata } = shadowDataDetector.detectShadowData(codeSnippet, fileType)

    // Generate summary based on findings
    let summary = "No shadow data detected in the provided code."

    if (findings.length > 0) {
      const criticalCount = findings.filter((f) => f.severity === "Critical").length
      const highCount = findings.filter((f) => f.severity === "High").length

      let riskLevel = "low"
      if (criticalCount > 0) {
        riskLevel = "critical"
      } else if (highCount > 0) {
        riskLevel = "high"
      } else if (findings.length > 3) {
        riskLevel = "medium"
      }

      summary = `Detected ${findings.length} instances of potential shadow data. Overall risk level: ${riskLevel}.`
      if (criticalCount > 0) {
        summary += ` Found ${criticalCount} critical issues that require immediate attention.`
      }
    }

    // Create report
    const report = new Report({
      title: "Shadow Data Scan",
      scanType: "shadow",
      summary,
      findings: findings.map((finding) => ({
        type: finding.type,
        description: `${finding.pattern} detected: ${finding.value}`,
        severity: finding.severity,
        location: `Line ${finding.location.line}, Column ${finding.location.column}`,
        context: finding.context,
      })),
      createdBy: req.session.user.id,
      company: req.session.user.company,
    })

    await report.save()

    res.json({
      success: true,
      report,
    })
  } catch (err) {
    console.error("Shadow data scan error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// API security scan
router.post("/api", isAuthenticated, async (req, res) => {
  try {
    const { codeSnippet, fileType } = req.body

    if (!codeSnippet || !fileType) {
      return res.status(400).json({ message: "Code snippet and file type are required" })
    }

    // Perform API security scan (simplified for example)
    const findings = [
      {
        type: "Missing Rate Limiting",
        description: "API endpoint does not implement rate limiting, which could lead to abuse",
        severity: "Medium",
        location: "Line 8, Column 1",
      },
      {
        type: "Insecure Authentication",
        description: "API uses basic authentication without HTTPS",
        severity: "High",
        location: "Line 12, Column 5",
      },
    ]

    // Create report
    const report = new Report({
      title: "API Security Scan",
      scanType: "api",
      summary:
        "Detected 2 potential API security issues. Recommend implementing rate limiting and secure authentication.",
      findings,
      createdBy: req.session.user.id,
      company: req.session.user.company,
    })

    await report.save()

    res.json({
      success: true,
      report,
    })
  } catch (err) {
    console.error("API security scan error:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router


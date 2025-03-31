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

// Shadow Data page
router.get("/", isAuthenticated, (req, res) => {
  res.render("shadow-data", { user: req.session.user })
})

// Scan for shadow data
router.post("/scan", isAuthenticated, async (req, res) => {
  try {
    const { codeSnippet, fileType } = req.body

    if (!codeSnippet || !fileType) {
      return res.status(400).json({ message: "Code snippet and file type are required" })
    }

    // Perform shadow data detection
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

module.exports = router


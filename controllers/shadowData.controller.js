const ShadowData = require("../models/ShadowData")
const Report = require("../models/Report")
const Keyword = require("../models/Keyword")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

// Scan for shadow data
exports.scanForShadowData = async (req, res) => {
  const { codeSnippet, fileType } = req.body

  if (!codeSnippet) {
    return res.status(400).json({ message: "Code snippet is required" })
  }

  try {
    // Get company keywords
    const keywords = await Keyword.find({ company: req.session.user.company })
    const keywordList = keywords.map((k) => k.word)

    // Perform scan
    const findings = detectShadowData(codeSnippet, keywordList, fileType)

    // Save findings to database
    const savedFindings = []
    for (const finding of findings) {
      const shadowData = new ShadowData({
        ...finding,
        company: req.session.user.company,
      })

      await shadowData.save()
      savedFindings.push(shadowData)
    }

    // Create report
    const report = new Report({
      title: `Shadow Data Scan - ${new Date().toLocaleString()}`,
      scanType: "Shadow Data",
      findings: findings.map((f) => ({
        type: f.dataType,
        severity: f.severity,
        description: `${f.dataType} detected: ${f.description}`,
        location: f.location.context,
      })),
      summary: generateSummary(findings),
      createdBy: req.session.user.id,
      company: req.session.user.company,
    })

    await report.save()

    // Update shadow data with report ID
    for (const finding of savedFindings) {
      finding.scanId = report._id
      await finding.save()
    }

    res.json({
      success: true,
      findings: savedFindings,
      report,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error scanning for shadow data", error: err.message })
  }
}

// Detect shadow data in code
function detectShadowData(code, keywords, fileType) {
  const findings = []

  // Split code into lines
  const lines = code.split("\n")

  // Check each line
  lines.forEach((line, index) => {
    // Check for PII
    const piiFindings = detectPII(line, index, lines)
    findings.push(...piiFindings)

    // Check for financial data
    const financialFindings = detectFinancialData(line, index, lines)
    findings.push(...financialFindings)

    // Check for credentials
    const credentialFindings = detectCredentials(line, index, lines)
    findings.push(...credentialFindings)

    // Check for API keys and tokens
    const apiKeyFindings = detectAPIKeysAndTokens(line, index, lines)
    findings.push(...apiKeyFindings)

    // Check for encoded/encrypted data
    const encodedFindings = detectEncodedData(line, index, lines)
    findings.push(...encodedFindings)

    // Check for custom keywords
    const keywordFindings = detectCustomKeywords(line, index, lines, keywords)
    findings.push(...keywordFindings)
  })

  return findings
}

// Detect PII (Personally Identifiable Information)
function detectPII(line, lineIndex, allLines) {
  const findings = []

  // Email pattern
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const emailMatches = line.match(emailRegex) || []

  for (const match of emailMatches) {
    findings.push({
      dataType: "PII",
      pattern: "Email",
      confidence: 90,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match,
      description: "Email address detected",
      severity: "Medium",
    })
  }

  // Phone number pattern (simple)
  const phoneRegex = /\b(\+\d{1,3}[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g;
  const phoneMatches = line.match(phoneRegex) || []

  for (const match of phoneMatches) {
    findings.push({
      dataType: "PII",
      pattern: "Phone",
      confidence: 80,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match,
      description: "Phone number detected",
      severity: "Medium",
    })
  }

  // SSN pattern
  const ssnRegex = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g
  const ssnMatches = line.match(ssnRegex) || []

  for (const match of ssnMatches) {
    findings.push({
      dataType: "PII",
      pattern: "SSN",
      confidence: 85,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match,
      description: "Social Security Number detected",
      severity: "Critical",
    })
  }

  return findings
}

// Detect financial data
function detectFinancialData(line, lineIndex, allLines) {
  const findings = []

  // Credit card pattern
  const ccRegex = /\b(?:\d[ -]*?){13,16}\b/g
  const ccMatches = line.match(ccRegex) || []

  for (const match of ccMatches) {
    // Remove spaces and dashes
    const cleaned = match.replace(/[\s-]/g, "")

    // Check if it passes Luhn algorithm (credit card validation)
    if (isValidCreditCard(cleaned)) {
      findings.push({
        dataType: "Financial",
        pattern: "Credit Card",
        confidence: 95,
        location: {
          line: lineIndex + 1,
          context: line.trim(),
        },
        sample: match,
        description: "Credit card number detected",
        severity: "Critical",
      })
    }
  }

  // Bank account pattern (simple)
  const bankRegex = /\baccount[^\w](?:\s*number)?[^\w]\s*['"]?(\d{8,17})['"]?/gi
  const bankMatches = [...line.matchAll(bankRegex)]

  for (const match of bankMatches) {
    findings.push({
      dataType: "Financial",
      pattern: "Bank Account",
      confidence: 75,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match[1],
      description: "Possible bank account number detected",
      severity: "High",
    })
  }

  return findings
}

// Detect credentials
function detectCredentials(line, lineIndex, allLines) {
  const findings = []

  // Password pattern
  const passwordRegex = /(?:password|passwd|pwd)[\s:=]+['"]([^'"]*)['"]/gi
  const passwordMatches = [...line.matchAll(passwordRegex)]

  for (const match of passwordMatches) {
    findings.push({
      dataType: "Credentials",
      pattern: "Password",
      confidence: 90,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match[0],
      description: "Password in plaintext detected",
      severity: "Critical",
    })
  }

  // Username pattern
  const usernameRegex = /(?:username|user|login)[\s:=]+['"]([^'"]*)['"]/gi
  const usernameMatches = [...line.matchAll(usernameRegex)]

  for (const match of usernameMatches) {
    findings.push({
      dataType: "Credentials",
      pattern: "Username",
      confidence: 85,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match[0],
      description: "Username in plaintext detected",
      severity: "Medium",
    })
  }

  return findings
}

// Detect API keys and tokens
function detectAPIKeysAndTokens(line, lineIndex, allLines) {
  const findings = []

  // API key patterns
  const apiKeyPatterns = [
    { regex: /(?:api[_-]?key|apikey)[\s:=]+['"]([^'"]{10,})['"]/gi, name: "API Key" },
    { regex: /(?:auth[_-]?token|token)[\s:=]+['"]([^'"]{10,})['"]/gi, name: "Auth Token" },
    { regex: /(?:secret[_-]?key|secretkey)[\s:=]+['"]([^'"]{10,})['"]/gi, name: "Secret Key" },
    { regex: /(?:access[_-]?key|accesskey)[\s:=]+['"]([^'"]{10,})['"]/gi, name: "Access Key" },
  ]

  for (const pattern of apiKeyPatterns) {
    const matches = [...line.matchAll(pattern.regex)]

    for (const match of matches) {
      findings.push({
        dataType: "API Key",
        pattern: pattern.name,
        confidence: 90,
        location: {
          line: lineIndex + 1,
          context: line.trim(),
        },
        sample: match[0],
        description: `${pattern.name} detected in plaintext`,
        severity: "Critical",
      })
    }
  }

  // JWT token pattern
  const jwtRegex = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g
  const jwtMatches = line.match(jwtRegex) || []

  for (const match of jwtMatches) {
    findings.push({
      dataType: "Token",
      pattern: "JWT",
      confidence: 95,
      location: {
        line: lineIndex + 1,
        context: line.trim(),
      },
      sample: match,
      description: "JWT token detected in plaintext",
      severity: "High",
    })
  }

  return findings
}

// Detect encoded/encrypted data
function detectEncodedData(line, lineIndex, allLines) {
  const findings = []

  // Base64 pattern with entropy check
  const base64Regex = /[A-Za-z0-9+/]{40,}={0,2}/g
  const base64Matches = line.match(base64Regex) || []

  for (const match of base64Matches) {
    // Calculate entropy to reduce false positives
    const entropy = calculateEntropy(match)

    if (entropy > 3.5) {
      // High entropy suggests non-random data
      findings.push({
        dataType: "Encoded",
        pattern: "Base64",
        confidence: 75,
        location: {
          line: lineIndex + 1,
          context: line.trim(),
        },
        sample: match,
        entropy,
        description: "Possible Base64 encoded sensitive data",
        severity: "Medium",
      })
    }
  }

  // Hash patterns
  const hashPatterns = [
    { regex: /\b[a-f0-9]{32}\b/gi, name: "MD5" },
    { regex: /\b[a-f0-9]{40}\b/gi, name: "SHA-1" },
    { regex: /\b[a-f0-9]{64}\b/gi, name: "SHA-256" },
  ]

  for (const pattern of hashPatterns) {
    const matches = line.match(pattern.regex) || []

    for (const match of matches) {
      findings.push({
        dataType: "Hash",
        pattern: pattern.name,
        confidence: 80,
        location: {
          line: lineIndex + 1,
          context: line.trim(),
        },
        sample: match,
        description: `Possible ${pattern.name} hash detected`,
        severity: "Medium",
      })
    }
  }

  return findings
}

// Detect custom keywords
function detectCustomKeywords(line, lineIndex, allLines, keywords) {
  const findings = []

  for (const keyword of keywords) {
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      findings.push({
        dataType: "Other",
        pattern: "Custom Keyword",
        confidence: 70,
        location: {
          line: lineIndex + 1,
          context: line.trim(),
        },
        sample: keyword,
        description: `Custom keyword "${keyword}" detected`,
        severity: "Medium",
      })
    }
  }

  return findings
}

// Calculate Shannon entropy
function calculateEntropy(str) {
  const len = str.length
  const frequencies = {}

  // Count character frequencies
  for (let i = 0; i < len; i++) {
    const char = str[i]
    frequencies[char] = (frequencies[char] || 0) + 1
  }

  // Calculate entropy
  let entropy = 0
  for (const char in frequencies) {
    const p = frequencies[char] / len
    entropy -= p * Math.log2(p)
  }

  return entropy
}

// Validate credit card using Luhn algorithm
function isValidCreditCard(number) {
  // Remove non-digit characters
  const digits = number.replace(/\D/g, "")

  if (digits.length < 13 || digits.length > 19) {
    return false
  }

  let sum = 0
  let shouldDouble = false

  // Loop from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(digits[i])

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

// Generate summary for shadow data report
function generateSummary(findings) {
  const totalFindings = findings.length

  const criticalCount = findings.filter((f) => f.severity === "Critical").length
  const highCount = findings.filter((f) => f.severity === "High").length
  const mediumCount = findings.filter((f) => f.severity === "Medium").length
  const lowCount = findings.filter((f) => f.severity === "Low").length

  const typeBreakdown = {}
  findings.forEach((f) => {
    typeBreakdown[f.dataType] = (typeBreakdown[f.dataType] || 0) + 1
  })

  let typeBreakdownStr = ""
  for (const type in typeBreakdown) {
    typeBreakdownStr += `${type}: ${typeBreakdown[type]}, `
  }

  return `Shadow Data Scan completed. Found ${totalFindings} potential issues: 
    ${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low.
    Type breakdown: ${typeBreakdownStr.slice(0, -2)}.`
}


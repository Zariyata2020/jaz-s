/**
 * Enhanced Shadow Data Detection Utility
 * Provides high-precision detection of sensitive data patterns
 */

// Regular expression patterns for different types of sensitive data
const PATTERNS = {
    // Personal Identifiable Information (PII)
    EMAIL: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      score: 0.8,
      category: "PII",
      description: "Email Address",
    },
    PHONE_US: {
        pattern: /\b(\+\d{1,2}\s?)?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
      score: 0.7,
      category: "PII",
      description: "US Phone Number",
    },
    PHONE_INTERNATIONAL: {
      pattern: /\b\+(?:[0-9] ?){6,14}[0-9]\b/g,
      score: 0.7,
      category: "PII",
      description: "International Phone Number",
    },
    SSN: {
      pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      score: 0.9,
      category: "PII",
      description: "Social Security Number",
    },
    DOB: {
      pattern: /\b(0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/g,
      score: 0.7,
      category: "PII",
      description: "Date of Birth",
    },
  
    // Financial Information
    CREDIT_CARD: {
      pattern:
        /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
      score: 0.95,
      category: "Financial",
      description: "Credit Card Number",
    },
    BANK_ACCOUNT: {
      pattern: /\b[0-9]{8,17}\b/g,
      score: 0.5, // Lower confidence due to potential false positives
      category: "Financial",
      description: "Potential Bank Account Number",
    },
    IBAN: {
      pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g,
      score: 0.85,
      category: "Financial",
      description: "IBAN",
    },
  
    // Authentication Credentials
    API_KEY: {
      pattern: /\b[A-Za-z0-9_-]{20,64}\b/g,
      score: 0.6, // Lower confidence due to potential false positives
      category: "Credentials",
      description: "Potential API Key",
    },
    AWS_KEY: {
      pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
      score: 0.9,
      category: "Credentials",
      description: "AWS Access Key",
    },
    AWS_SECRET: {
      pattern: /\b[0-9a-zA-Z/+]{40}\b/g,
      score: 0.8,
      category: "Credentials",
      description: "Potential AWS Secret Key",
    },
    PRIVATE_KEY: {
      pattern: /-----BEGIN( RSA| DSA| EC| OPENSSH| PGP)? PRIVATE KEY( BLOCK)?-----/g,
      score: 0.95,
      category: "Credentials",
      description: "Private Key",
    },
    PASSWORD_FIELD: {
      pattern:
        /\b(?:password|passwd|pwd|secret|credentials?)\s*[=:]\s*['"][^'"]{3,}['"]|\b(?:password|passwd|pwd|secret|credentials?)\s*[=:]\s*[^;,\s]{3,}/gi,
      score: 0.85,
      category: "Credentials",
      description: "Password in Code",
    },
  
    // Healthcare Information
    HEALTH_INSURANCE: {
      pattern: /\b[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{4}\b/g,
      score: 0.6, // Lower confidence due to overlap with SSN pattern
      category: "Healthcare",
      description: "Potential Health Insurance Number",
    },
    MEDICAL_RECORD: {
      pattern: /\bMRN:?\s*[0-9]{5,10}\b/gi,
      score: 0.8,
      category: "Healthcare",
      description: "Medical Record Number",
    },
  
    // IP Addresses and URLs
    IP_ADDRESS: {
      pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      score: 0.7,
      category: "Network",
      description: "IP Address",
    },
    INTERNAL_URL: {
      pattern:
        /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/[^\s"']*)?/g,
      score: 0.8,
      category: "Network",
      description: "Internal URL",
    },
  }
  
  // Context-aware patterns that look for specific keywords near potential sensitive data
  const CONTEXT_PATTERNS = [
    {
      keywords: ["ssn", "social security", "social security number"],
      pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      score: 0.95,
      category: "PII",
      description: "Social Security Number (with context)",
    },
    {
      keywords: ["password", "passwd", "pwd", "secret", "credentials"],
      pattern: /['"][^'"]{8,}['"]|[^;,\s]{8,}/g,
      score: 0.8,
      category: "Credentials",
      description: "Password (with context)",
    },
    {
      keywords: ["credit card", "cc", "credit card number", "card number", "payment card"],
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      score: 0.9,
      category: "Financial",
      description: "Credit Card Number (with context)",
    },
    {
      keywords: ["api key", "apikey", "api_key", "client_secret", "client secret", "app secret"],
      pattern: /['"][A-Za-z0-9_-]{16,64}['"]|[A-Za-z0-9_-]{16,64}/g,
      score: 0.85,
      category: "Credentials",
      description: "API Key (with context)",
    },
  ]
  
  /**
   * Analyzes code for shadow data patterns
   * @param {string} code - The code to analyze
   * @param {string} fileType - The type of file being analyzed
   * @param {Object} options - Additional options for detection
   * @returns {Object} Detection results with findings and metadata
   */
  function detectShadowData(code, fileType, options = {}) {
    const findings = []
    const metadata = {
      totalPatterns: 0,
      categoryCounts: {},
      highestScore: 0,
      averageScore: 0,
    }
  
    // Skip detection for certain file types that are unlikely to contain shadow data
    const lowRiskFileTypes = ["css", "svg", "png", "jpg", "jpeg", "gif", "ico"]
    if (lowRiskFileTypes.includes(fileType.toLowerCase())) {
      return { findings, metadata }
    }
  
    // Apply standard pattern detection
    for (const [name, patternInfo] of Object.entries(PATTERNS)) {
      const { pattern, score, category, description } = patternInfo
  
      // Reset the regex lastIndex to ensure we find all matches
      pattern.lastIndex = 0
  
      let match
      while ((match = pattern.exec(code)) !== null) {
        // Get surrounding context (20 chars before and after)
        const startPos = Math.max(0, match.index - 20)
        const endPos = Math.min(code.length, match.index + match[0].length + 20)
        const context = code.substring(startPos, endPos)
  
        // Apply file type specific scoring adjustments
        let adjustedScore = score
  
        // Reduce score for patterns in comments
        const isInComment = isCodeComment(code, match.index, fileType)
        if (isInComment) {
          adjustedScore *= 0.7 // Reduce score for matches in comments
        }
  
        // Adjust score based on file type
        adjustedScore = adjustScoreByFileType(adjustedScore, fileType, name)
  
        // Check for false positives
        if (!isLikelyFalsePositive(match[0], name, context)) {
          findings.push({
            type: name,
            pattern: description,
            value: maskSensitiveData(match[0], name),
            location: getLocationInfo(code, match.index),
            context: maskSensitiveData(context, name),
            score: adjustedScore,
            category: category,
            severity: getSeverityFromScore(adjustedScore),
          })
  
          // Update metadata
          metadata.totalPatterns++
          metadata.categoryCounts[category] = (metadata.categoryCounts[category] || 0) + 1
          metadata.highestScore = Math.max(metadata.highestScore, adjustedScore)
        }
      }
    }
  
    // Apply context-aware pattern detection
    for (const contextPattern of CONTEXT_PATTERNS) {
      const { keywords, pattern, score, category, description } = contextPattern
  
      // Check if any keywords are present in the code
      const hasKeyword = keywords.some((keyword) => code.toLowerCase().includes(keyword.toLowerCase()))
  
      if (hasKeyword) {
        // Reset the regex lastIndex
        pattern.lastIndex = 0
  
        let match
        while ((match = pattern.exec(code)) !== null) {
          // Check if the match is near any of the keywords
          const nearKeyword = isNearKeywords(code, match.index, match[0].length, keywords)
  
          if (nearKeyword) {
            // Get surrounding context
            const startPos = Math.max(0, match.index - 20)
            const endPos = Math.min(code.length, match.index + match[0].length + 20)
            const context = code.substring(startPos, endPos)
  
            // Apply file type specific scoring adjustments
            let adjustedScore = score
            adjustedScore = adjustScoreByFileType(adjustedScore, fileType, description)
  
            findings.push({
              type: description,
              pattern: description,
              value: maskSensitiveData(match[0], description),
              location: getLocationInfo(code, match.index),
              context: maskSensitiveData(context, description),
              score: adjustedScore,
              category: category,
              severity: getSeverityFromScore(adjustedScore),
            })
  
            // Update metadata
            metadata.totalPatterns++
            metadata.categoryCounts[category] = (metadata.categoryCounts[category] || 0) + 1
            metadata.highestScore = Math.max(metadata.highestScore, adjustedScore)
          }
        }
      }
    }
  
    // Calculate average score
    if (findings.length > 0) {
      metadata.averageScore = findings.reduce((sum, finding) => sum + finding.score, 0) / findings.length
    }
  
    // Sort findings by score (highest first)
    findings.sort((a, b) => b.score - a.score)
  
    return { findings, metadata }
  }
  
  /**
   * Checks if a match is likely a false positive based on context
   * @param {string} match - The matched string
   * @param {string} patternName - The name of the pattern
   * @param {string} context - The surrounding context
   * @returns {boolean} True if likely a false positive
   */
  function isLikelyFalsePositive(match, patternName, context) {
    // Common false positive patterns
    if (patternName === "BANK_ACCOUNT" && /\b(width|height|size|length|count|index|timestamp)\b/i.test(context)) {
      return true
    }
  
    if (patternName === "API_KEY" && /\b(test|example|sample|dummy|placeholder)\b/i.test(context)) {
      return true
    }
  
    // Check for test credit card numbers
    if (patternName === "CREDIT_CARD") {
      const testCards = ["4111111111111111", "5555555555554444", "378282246310005"]
      if (testCards.some((card) => match.replace(/[\s-]/g, "").includes(card))) {
        return true
      }
    }
  
    return false
  }
  
  /**
   * Checks if a match is near any of the specified keywords
   * @param {string} code - The full code
   * @param {number} matchIndex - The index of the match
   * @param {number} matchLength - The length of the match
   * @param {string[]} keywords - The keywords to check
   * @returns {boolean} True if the match is near any keyword
   */
  function isNearKeywords(code, matchIndex, matchLength, keywords) {
    // Check within 50 characters before and after the match
    const startPos = Math.max(0, matchIndex - 50)
    const endPos = Math.min(code.length, matchIndex + matchLength + 50)
    const context = code.substring(startPos, endPos).toLowerCase()
  
    return keywords.some((keyword) => context.includes(keyword.toLowerCase()))
  }
  
  /**
   * Checks if a match is within a code comment
   * @param {string} code - The full code
   * @param {number} matchIndex - The index of the match
   * @param {string} fileType - The type of file
   * @returns {boolean} True if the match is in a comment
   */
  function isCodeComment(code, matchIndex, fileType) {
    // Get the line containing the match
    const lineStart = code.lastIndexOf("\n", matchIndex) + 1
    const lineEnd = code.indexOf("\n", matchIndex)
    const line = code.substring(lineStart, lineEnd !== -1 ? lineEnd : code.length)
  
    // Check for single-line comments based on file type
    switch (fileType.toLowerCase()) {
      case "js":
      case "javascript":
      case "ts":
      case "typescript":
      case "java":
      case "c":
      case "cpp":
      case "csharp":
      case "php":
        // Check for // comments
        const commentIndex = line.indexOf("//")
        if (commentIndex !== -1 && matchIndex >= lineStart + commentIndex) {
          return true
        }
  
        // Check for /* */ comments
        let inComment = false
        let commentStart = -1
        for (let i = 0; i < matchIndex; i++) {
          if (code.substring(i, i + 2) === "/*") {
            inComment = true
            commentStart = i
            i++
          } else if (code.substring(i, i + 2) === "*/" && inComment) {
            inComment = false
            i++
          }
        }
  
        return inComment && commentStart !== -1 && matchIndex > commentStart
  
      case "html":
      case "xml":
        // Check for <!-- --> comments
        let htmlCommentStart = -1
        for (let i = 0; i < matchIndex; i++) {
          if (code.substring(i, i + 4) === "<!--") {
            htmlCommentStart = i
            i += 3
          } else if (code.substring(i, i + 3) === "-->" && htmlCommentStart !== -1) {
            htmlCommentStart = -1
            i += 2
          }
        }
  
        return htmlCommentStart !== -1 && matchIndex > htmlCommentStart
  
      case "python":
        // Check for # comments
        const pythonCommentIndex = line.indexOf("#")
        return pythonCommentIndex !== -1 && matchIndex >= lineStart + pythonCommentIndex
  
      default:
        return false
    }
  }
  
  /**
   * Adjusts the detection score based on file type
   * @param {number} score - The initial score
   * @param {string} fileType - The type of file
   * @param {string} patternName - The name of the pattern
   * @returns {number} The adjusted score
   */
  function adjustScoreByFileType(score, fileType, patternName) {
    let adjustedScore = score
  
    switch (fileType.toLowerCase()) {
      case "js":
      case "javascript":
      case "ts":
      case "typescript":
        // Higher confidence for credentials in code files
        if (patternName.includes("API_KEY") || patternName.includes("PASSWORD")) {
          adjustedScore *= 1.2
        }
        break
  
      case "json":
      case "config":
        // Higher confidence for credentials in config files
        if (patternName.includes("API_KEY") || patternName.includes("SECRET") || patternName.includes("PASSWORD")) {
          adjustedScore *= 1.3
        }
        break
  
      case "html":
        // Lower confidence for certain patterns in HTML
        if (patternName === "IP_ADDRESS" || patternName === "INTERNAL_URL") {
          adjustedScore *= 0.8
        }
        break
  
      case "sql":
        // Higher confidence for PII in SQL
        if (patternName.includes("SSN") || patternName.includes("CREDIT_CARD")) {
          adjustedScore *= 1.2
        }
        break
    }
  
    // Cap the score at 1.0
    return Math.min(adjustedScore, 1.0)
  }
  
  /**
   * Gets the location information for a match
   * @param {string} code - The full code
   * @param {number} index - The index of the match
   * @returns {Object} Location information
   */
  function getLocationInfo(code, index) {
    // Count lines up to the match
    const lines = code.substring(0, index).split("\n")
    const lineNumber = lines.length
    const columnNumber = lines[lines.length - 1].length + 1
  
    return {
      line: lineNumber,
      column: columnNumber,
    }
  }
  
  /**
   * Masks sensitive data for display
   * @param {string} data - The data to mask
   * @param {string} type - The type of data
   * @returns {string} The masked data
   */
  function maskSensitiveData(data, type) {
    if (type.includes("CREDIT_CARD")) {
      // Mask all but last 4 digits of credit card
      return data.replace(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?)(\d{4})\b/g, (match, p1, p2) => {
        return p1.replace(/\d/g, "*") + p2
      })
    } else if (type.includes("SSN")) {
      // Mask all but last 4 digits of SSN
      return data.replace(/\b(\d{3}[-\s]?\d{2}[-\s]?)(\d{4})\b/g, (match, p1, p2) => {
        return p1.replace(/\d/g, "*") + p2
      })
    } else if (type.includes("API_KEY") || type.includes("SECRET") || type.includes("PASSWORD")) {
      // Mask API keys and secrets completely except first and last 2 chars
      return data.replace(
        /\b([A-Za-z0-9_-]{2})([A-Za-z0-9_-]{3,})([A-Za-z0-9_-]{2})\b/g,
        "$1" + "*".repeat(Math.min(10, "$2".length)) + "$3",
      )
    }
  
    // Default masking for other types
    return data
  }
  
  /**
   * Determines severity level based on confidence score
   * @param {number} score - The confidence score
   * @returns {string} The severity level
   */
  function getSeverityFromScore(score) {
    if (score >= 0.9) return "Critical"
    if (score >= 0.75) return "High"
    if (score >= 0.5) return "Medium"
    return "Low"
  }
  
  module.exports = {
    detectShadowData,
    PATTERNS,
  }
  
  
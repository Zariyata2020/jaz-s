const ApiEndpoint = require("../models/ApiEndpoint")
const Report = require("../models/Report")
const axios = require("axios")
const jwt = require("jsonwebtoken")
const SwaggerParser = require("swagger-parser")
const { URL } = require("url")

// Discover API endpoints from OpenAPI/Swagger documentation
exports.discoverApiEndpoints = async (req, res) => {
  const { baseUrl, authToken, authType } = req.body

  if (!baseUrl) {
    return res.status(400).json({ message: "Base URL is required" })
  }

  try {
    // Validate URL format
    new URL(baseUrl)

    // Set up headers based on auth type
    const headers = {}
    if (authToken) {
      if (authType === "Bearer") {
        headers["Authorization"] = `Bearer ${authToken}`
      } else if (authType === "API Key") {
        headers["X-API-Key"] = authToken
      }
    }

    // Try common paths for API documentation
    const commonPaths = ["/swagger.json", "/api-docs", "/swagger", "/openapi.json", "/docs", "/"]

    let apiSpec = null
    let discoveredEndpoints = []

    // Try to find OpenAPI/Swagger documentation
    for (const path of commonPaths) {
      try {
        const response = await axios.get(`${baseUrl}${path}`, { headers })

        if (
          response.status === 200 &&
          (response.headers["content-type"].includes("application/json") ||
            response.data.swagger ||
            response.data.openapi)
        ) {
          try {
            // Parse OpenAPI spec
            apiSpec = await SwaggerParser.parse(response.data)
            break
          } catch (parseError) {
            console.log(`Failed to parse API spec from ${path}: ${parseError.message}`)
          }
        }
      } catch (error) {
        console.log(`Path ${path} not available: ${error.message}`)
      }
    }

    if (apiSpec) {
      // Extract endpoints from OpenAPI spec
      discoveredEndpoints = extractEndpointsFromSpec(apiSpec, baseUrl)
    } else {
      // Fallback to manual discovery
      discoveredEndpoints = await manualApiDiscovery(baseUrl, headers)
    }

    // Save discovered endpoints to database
    const savedEndpoints = []
    for (const endpoint of discoveredEndpoints) {
      const newEndpoint = new ApiEndpoint({
        ...endpoint,
        company: req.session.user.company,
        createdBy: req.session.user.id,
      })

      await newEndpoint.save()
      savedEndpoints.push(newEndpoint)
    }

    res.json({
      success: true,
      endpoints: savedEndpoints,
      message: `Discovered ${savedEndpoints.length} API endpoints`,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error discovering API endpoints", error: err.message })
  }
}

// Test API endpoints for vulnerabilities
exports.testApiEndpoints = async (req, res) => {
  const { endpointIds } = req.body

  if (!endpointIds || !Array.isArray(endpointIds) || endpointIds.length === 0) {
    return res.status(400).json({ message: "Endpoint IDs are required" })
  }

  try {
    const endpoints = await ApiEndpoint.find({
      _id: { $in: endpointIds },
      company: req.session.user.company,
    })

    if (endpoints.length === 0) {
      return res.status(404).json({ message: "No endpoints found" })
    }

    const results = []

    for (const endpoint of endpoints) {
      // Test for BOLA vulnerabilities
      const bolaResults = await testForBOLA(endpoint)

      // Test for JWT vulnerabilities
      const jwtResults = await testForJWTVulnerabilities(endpoint)

      // Test for parameter pollution
      const pollutionResults = await testForParameterPollution(endpoint)

      // Combine results
      const vulnerabilities = [...bolaResults, ...jwtResults, ...pollutionResults]

      // Update endpoint with vulnerabilities
      endpoint.vulnerabilities = vulnerabilities
      endpoint.lastTested = new Date()
      await endpoint.save()

      results.push({
        endpoint: endpoint.url,
        method: endpoint.method,
        vulnerabilities,
      })
    }

    // Create a report
    const report = new Report({
      title: `API Security Test - ${new Date().toLocaleString()}`,
      scanType: "API",
      findings: results.flatMap((r) =>
        r.vulnerabilities.map((v) => ({
          type: v.type,
          severity: v.severity,
          description: `${v.description} (${r.method} ${r.endpoint})`,
          location: `${r.method} ${r.endpoint}`,
        })),
      ),
      summary: generateSummary(results),
      createdBy: req.session.user.id,
      company: req.session.user.company,
    })

    await report.save()

    res.json({
      success: true,
      results,
      report,
      message: `Tested ${endpoints.length} API endpoints`,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error testing API endpoints", error: err.message })
  }
}

// Analyze JWT token
exports.analyzeJwtToken = async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ message: "JWT token is required" })
  }

  try {
    const analysis = analyzeJWT(token)

    res.json({
      success: true,
      analysis,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error analyzing JWT token", error: err.message })
  }
}

// Helper function to extract endpoints from OpenAPI spec
function extractEndpointsFromSpec(apiSpec, baseUrl) {
  const endpoints = []

  // Handle both OpenAPI 2.0 (Swagger) and OpenAPI 3.0
  const paths = apiSpec.paths || {}

  for (const path in paths) {
    const pathItem = paths[path]

    for (const method in pathItem) {
      if (["get", "post", "put", "delete", "patch", "options"].includes(method.toLowerCase())) {
        const operation = pathItem[method]

        // Extract parameters
        const parameters = []
        if (operation.parameters) {
          for (const param of operation.parameters) {
            parameters.push({
              name: param.name,
              type: param.type || param.schema?.type || "string",
              required: !!param.required,
              description: param.description || "",
            })
          }
        }

        // Extract tags
        const tags = operation.tags || []

        endpoints.push({
          url: `${baseUrl}${path}`,
          method: method.toUpperCase(),
          parameters,
          description: operation.summary || operation.description || "",
          tags,
          authType: determineAuthType(operation),
        })
      }
    }
  }

  return endpoints
}

// Helper function to determine auth type from OpenAPI operation
function determineAuthType(operation) {
  if (!operation.security || operation.security.length === 0) {
    return "None"
  }

  const security = operation.security[0]

  if (security.hasOwnProperty("Bearer") || security.hasOwnProperty("bearer")) {
    return "Bearer"
  } else if (security.hasOwnProperty("OAuth2") || security.hasOwnProperty("oauth2")) {
    return "OAuth"
  } else if (security.hasOwnProperty("ApiKey") || security.hasOwnProperty("apiKey")) {
    return "API Key"
  } else if (security.hasOwnProperty("BasicAuth") || security.hasOwnProperty("basic")) {
    return "Basic"
  }

  return "Custom"
}

// Helper function for manual API discovery
async function manualApiDiscovery(baseUrl, headers) {
  const endpoints = []

  // Common API paths to check
  const commonPaths = ["/api", "/api/v1", "/api/v2", "/v1", "/v2", "/rest"]

  // Common endpoints to check
  const commonEndpoints = ["/users", "/auth", "/login", "/register", "/products", "/orders", "/items", "/data"]

  // Try common HTTP methods
  const methods = ["GET", "POST"]

  for (const basePath of commonPaths) {
    for (const endpoint of commonEndpoints) {
      for (const method of methods) {
        try {
          const url = `${baseUrl}${basePath}${endpoint}`

          if (method === "GET") {
            const response = await axios.get(url, {
              headers,
              validateStatus: (status) => status < 500, // Accept any non-server error
            })

            if (response.status !== 404) {
              endpoints.push({
                url,
                method,
                parameters: [],
                description: "Discovered endpoint",
                tags: ["discovered"],
                authType: response.status === 401 || response.status === 403 ? "Bearer" : "None",
              })
            }
          } else {
            // For POST, just check if it exists without sending data
            const response = await axios.options(url, {
              headers,
              validateStatus: (status) => status < 500,
            })

            if (response.status !== 404 && (response.headers["allow"] || "").includes("POST")) {
              endpoints.push({
                url,
                method: "POST",
                parameters: [],
                description: "Discovered endpoint",
                tags: ["discovered"],
                authType: "Unknown",
              })
            }
          }
        } catch (error) {
          // Ignore errors during discovery
        }
      }
    }
  }

  return endpoints
}

// Test for BOLA vulnerabilities
async function testForBOLA(endpoint) {
  const vulnerabilities = []

  // Skip if not a GET request with an ID parameter
  if (endpoint.method !== "GET") {
    return vulnerabilities
  }

  // Look for ID parameters in the URL
  const urlParts = endpoint.url.split("/")
  const potentialIds = urlParts.filter((part) => {
    // Check if part looks like an ID (numeric or UUID)
    return /^\d+$/.test(part) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)
  })

  if (potentialIds.length === 0) {
    // Also check for ID parameters
    const idParams = endpoint.parameters.filter((p) => p.name.toLowerCase().includes("id") || p.name === "id")

    if (idParams.length === 0) {
      return vulnerabilities
    }
  }

  // This endpoint has ID parameters, so it might be vulnerable to BOLA
  vulnerabilities.push({
    type: "BOLA",
    severity: "High",
    description:
      "This endpoint accepts ID parameters and might be vulnerable to Broken Object Level Authorization if proper authorization checks are not implemented.",
    remediation:
      "Ensure that users can only access objects they are authorized to access. Implement proper authorization checks for each request.",
    detectedAt: new Date(),
  })

  return vulnerabilities
}

// Test for JWT vulnerabilities
async function testForJWTVulnerabilities(endpoint) {
  const vulnerabilities = []

  // Skip if not using JWT auth
  if (endpoint.authType !== "Bearer" && endpoint.authType !== "JWT") {
    return vulnerabilities
  }

  // Check for potential JWT vulnerabilities
  vulnerabilities.push({
    type: "JWT",
    severity: "Medium",
    description:
      "This endpoint uses JWT authentication. Ensure that tokens are properly validated and have appropriate expiration times.",
    remediation:
      "Validate JWT signatures, check expiration times, and use strong signing algorithms (RS256 instead of HS256).",
    detectedAt: new Date(),
  })

  return vulnerabilities
}

// Test for parameter pollution
async function testForParameterPollution(endpoint) {
  const vulnerabilities = []

  // Skip if no parameters
  if (endpoint.parameters.length === 0) {
    return vulnerabilities
  }

  // Check for potential parameter pollution
  vulnerabilities.push({
    type: "Parameter Pollution",
    severity: "Medium",
    description:
      "This endpoint accepts parameters that might be vulnerable to HTTP Parameter Pollution if not properly sanitized.",
    remediation:
      "Implement proper parameter validation and sanitization. Consider using a middleware to prevent parameter pollution attacks.",
    detectedAt: new Date(),
  })

  return vulnerabilities
}

// Analyze JWT token
function analyzeJWT(token) {
  try {
    // Decode token without verification
    const decoded = jwt.decode(token, { complete: true })

    if (!decoded) {
      return {
        valid: false,
        error: "Invalid JWT format",
      }
    }

    const { header, payload } = decoded

    // Check algorithm
    const algorithm = header.alg
    const isWeakAlgorithm = ["none", "HS256"].includes(algorithm)

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    const isExpired = payload.exp && payload.exp < now

    // Check for sensitive data
    const sensitiveFields = []
    const sensitivePatterns = [
      { field: "password", pattern: /password/i },
      { field: "credit card", pattern: /credit|card|cc|visa|mastercard|amex/i },
      { field: "SSN", pattern: /ssn|social security/i },
      { field: "API key", pattern: /key|api[-_]?key/i },
    ]

    for (const field in payload) {
      for (const pattern of sensitivePatterns) {
        if (pattern.pattern.test(field)) {
          sensitiveFields.push({ field, type: pattern.field })
        }
      }
    }

    // Check for missing claims
    const missingClaims = []
    const recommendedClaims = ["exp", "iat", "iss", "aud", "sub"]

    for (const claim of recommendedClaims) {
      if (!payload[claim]) {
        missingClaims.push(claim)
      }
    }

    return {
      valid: true,
      header,
      payload,
      issues: {
        weakAlgorithm: isWeakAlgorithm,
        expired: isExpired,
        sensitiveData: sensitiveFields.length > 0,
        sensitiveFields,
        missingClaims: missingClaims.length > 0,
        missingClaimsList: missingClaims,
      },
      recommendations: generateJWTRecommendations(isWeakAlgorithm, isExpired, sensitiveFields, missingClaims),
    }
  } catch (err) {
    return {
      valid: false,
      error: err.message,
    }
  }
}

// Generate JWT recommendations
function generateJWTRecommendations(isWeakAlgorithm, isExpired, sensitiveFields, missingClaims) {
  const recommendations = []

  if (isWeakAlgorithm) {
    recommendations.push('Use a stronger algorithm like RS256 instead of HS256 or "none".')
  }

  if (isExpired) {
    recommendations.push("The token is expired. Implement proper token refresh mechanisms.")
  }

  if (sensitiveFields.length > 0) {
    recommendations.push("Remove sensitive data from JWT payload. Store sensitive data server-side.")
  }

  if (missingClaims.length > 0) {
    recommendations.push(`Add recommended claims: ${missingClaims.join(", ")}.`)
  }

  return recommendations
}

// Generate summary for API test report
function generateSummary(results) {
  const totalEndpoints = results.length
  const totalVulnerabilities = results.reduce((sum, r) => sum + r.vulnerabilities.length, 0)

  const criticalCount = results.reduce(
    (sum, r) => sum + r.vulnerabilities.filter((v) => v.severity === "Critical").length,
    0,
  )

  const highCount = results.reduce((sum, r) => sum + r.vulnerabilities.filter((v) => v.severity === "High").length, 0)

  const mediumCount = results.reduce(
    (sum, r) => sum + r.vulnerabilities.filter((v) => v.severity === "Medium").length,
    0,
  )

  const lowCount = results.reduce((sum, r) => sum + r.vulnerabilities.filter((v) => v.severity === "Low").length, 0)

  return `API Security Test completed on ${totalEndpoints} endpoints. Found ${totalVulnerabilities} potential vulnerabilities: 
    ${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low.`
}


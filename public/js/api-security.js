document.addEventListener("DOMContentLoaded", () => {
  // Load API endpoints
  loadApiEndpoints()

  // API Scan form
  const apiScanForm = document.getElementById("api-scan-form")
  const scanResults = document.getElementById("scan-results")

  if (apiScanForm) {
    apiScanForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const apiUrlElement = document.getElementById("api-url")
      const apiMethodElement = document.getElementById("api-method")
      const apiHeadersElement = document.getElementById("api-headers")

      if (!apiUrlElement) {
        console.error("API URL element not found")
        return
      }

      const apiUrl = apiUrlElement.value
      const apiMethod = apiMethodElement ? apiMethodElement.value : "GET"
      let apiHeaders = {}

      if (apiHeadersElement && apiHeadersElement.value.trim()) {
        try {
          apiHeaders = JSON.parse(apiHeadersElement.value)
        } catch (err) {
          alert("Invalid JSON format for headers")
          return
        }
      }

      try {
        // Show loading state
        const submitBtn = apiScanForm.querySelector("button[type='submit']")
        const originalBtnText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = "Scanning..."

        const response = await fetch("/api-security/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: apiUrl,
            method: apiMethod,
            headers: apiHeaders,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.results) {
          displayScanResults(data.results)
          scanResults.classList.add("active")
        } else {
          alert(data.message || "Scan failed")
        }

        // Reset button
        submitBtn.disabled = false
        submitBtn.textContent = originalBtnText
      } catch (err) {
        console.error("Error during API scan:", err)
        alert("An error occurred during the scan. Please try again.")

        // Reset button state
        const submitBtn = apiScanForm.querySelector("button[type='submit']")
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Scan API Endpoint"
        }
      }
    })
  }

  // Display scan results
  function displayScanResults(results) {
    const resultUrl = document.getElementById("result-url")
    const resultMethod = document.getElementById("result-method")
    const resultTimestamp = document.getElementById("result-timestamp")
    const resultFindings = document.getElementById("result-findings")
    const resultRecommendations = document.getElementById("result-recommendations")

    if (!resultUrl || !resultMethod || !resultTimestamp || !resultFindings || !resultRecommendations) {
      console.error("Result elements not found")
      return
    }

    resultUrl.textContent = results.url
    resultMethod.textContent = results.method
    resultTimestamp.textContent = new Date(results.timestamp).toLocaleString()

    // Display findings
    resultFindings.innerHTML = ""

    if (!results.findings || results.findings.length === 0) {
      resultFindings.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>No vulnerabilities detected</p>
        </div>
      `
    } else {
      results.findings.forEach((finding) => {
        const findingItem = document.createElement("div")
        findingItem.className = "vulnerability-item"

        findingItem.innerHTML = `
          <div class="vulnerability-header">
            <div class="vulnerability-type">${finding.type}</div>
            <div class="vulnerability-severity ${finding.severity.toLowerCase()}">${finding.severity}</div>
          </div>
          <div class="vulnerability-description">${finding.description}</div>
        `

        resultFindings.appendChild(findingItem)
      })
    }

    // Display recommendations
    resultRecommendations.innerHTML = ""

    if (results.recommendations && results.recommendations.length > 0) {
      results.recommendations.forEach((recommendation) => {
        const li = document.createElement("li")
        li.textContent = recommendation
        resultRecommendations.appendChild(li)
      })
    } else {
      resultRecommendations.innerHTML = "<li>No specific recommendations available</li>"
    }
  }

  // Load API endpoints
  async function loadApiEndpoints() {
    const endpointsList = document.getElementById("endpoints-list")

    if (!endpointsList) {
      console.error("Endpoints list element not found")
      return
    }

    try {
      const response = await fetch("/api-security/endpoints")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const endpoints = await response.json()

      if (endpoints.length === 0) {
        endpointsList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-plug"></i>
            <p>No API endpoints detected</p>
          </div>
        `
        return
      }

      endpointsList.innerHTML = ""

      endpoints.forEach((endpoint) => {
        const endpointItem = document.createElement("div")
        endpointItem.className = "endpoint-item"

        const methodClass = endpoint.method.toLowerCase()

        endpointItem.innerHTML = `
          <div class="endpoint-header">
            <div class="endpoint-path">${endpoint.path}</div>
            <div class="endpoint-method ${methodClass}">${endpoint.method}</div>
          </div>
          <div class="endpoint-details">
            <div class="endpoint-detail"><strong>Auth:</strong> ${endpoint.auth}</div>
            <div class="endpoint-detail"><strong>Rate Limit:</strong> ${endpoint.rateLimit ? "Yes" : "No"}</div>
          </div>
        `

        // Add vulnerabilities if any
        if (endpoint.vulnerabilities && endpoint.vulnerabilities.length > 0) {
          const vulnContainer = document.createElement("div")
          vulnContainer.className = "endpoint-vulnerabilities"

          endpoint.vulnerabilities.forEach((vuln) => {
            const vulnItem = document.createElement("div")
            vulnItem.className = "vulnerability-item"

            vulnItem.innerHTML = `
              <div class="vulnerability-header">
                <div class="vulnerability-type">${vuln.type}</div>
                <div class="vulnerability-severity ${vuln.severity.toLowerCase()}">${vuln.severity}</div>
              </div>
              <div class="vulnerability-description">${vuln.description}</div>
            `

            vulnContainer.appendChild(vulnItem)
          })

          endpointItem.appendChild(vulnContainer)
        }

        endpointsList.appendChild(endpointItem)
      })
    } catch (err) {
      console.error("Error loading API endpoints:", err)
      endpointsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading API endpoints</p>
        </div>
      `
    }
  }

  // Logout
  const logoutLink = document.getElementById("logout-link")
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault()

      try {
        const response = await fetch("/auth/logout")

        if (!response.ok) {
          throw new Error(`Logout failed: ${response.status} ${response.statusText}`)
        }

        window.location.href = "/"
      } catch (err) {
        console.error("Error during logout:", err)
        window.location.href = "/"
      }
    })
  }
})


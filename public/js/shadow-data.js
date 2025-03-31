document.addEventListener("DOMContentLoaded", () => {
  // Shadow Data form
  const shadowDataForm = document.getElementById("shadow-data-form")
  const scanResults = document.getElementById("scan-results")
  const resultsSummary = document.getElementById("results-summary")
  const findingsList = document.getElementById("findings-list")
  const downloadReportBtn = document.getElementById("download-report")
  const backToScanBtn = document.getElementById("back-to-scan")

  // Current report data
  let currentReport = null

  if (shadowDataForm) {
    shadowDataForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const fileTypeElement = document.getElementById("file-type")
      const codeSnippetElement = document.getElementById("code-snippet")

      if (!fileTypeElement || !codeSnippetElement) {
        console.error("Form elements not found")
        return
      }

      const fileType = fileTypeElement.value
      const codeSnippet = codeSnippetElement.value

      if (!codeSnippet.trim()) {
        alert("Please enter code or text to scan")
        return
      }

      try {
        // Show loading state
        const submitBtn = shadowDataForm.querySelector("button[type='submit']")
        const originalBtnText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = "Scanning..."

        const response = await fetch("/shadow-data/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ codeSnippet, fileType }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.report) {
          currentReport = data.report
          displayResults(data.report)

          // Hide form, show results
          shadowDataForm.closest(".shadow-data-scan").classList.add("hidden")
          scanResults.classList.remove("hidden")
        } else {
          alert(data.message || "Scan failed")
        }

        // Reset button
        submitBtn.disabled = false
        submitBtn.textContent = originalBtnText
      } catch (err) {
        console.error("Error during shadow data scan:", err)
        alert("An error occurred during the scan. Please try again.")

        // Reset button state
        const submitBtn = shadowDataForm.querySelector("button[type='submit']")
        submitBtn.disabled = false
        submitBtn.textContent = "Run Shadow Data Scan"
      }
    })
  }

  // Display scan results
  function displayResults(report) {
    if (!resultsSummary || !findingsList) {
      console.error("Results elements not found")
      return
    }

    // Display summary
    resultsSummary.textContent = report.summary

    // Display findings
    findingsList.innerHTML = ""

    if (!report.findings || report.findings.length === 0) {
      findingsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>No shadow data detected</p>
        </div>
      `
      return
    }

    report.findings.forEach((finding) => {
      const findingItem = document.createElement("div")
      findingItem.className = `finding-item ${finding.severity.toLowerCase()}`

      findingItem.innerHTML = `
        <div class="finding-header">
          <div class="finding-type">${finding.type || "Unknown"}</div>
          <div class="finding-severity ${finding.severity.toLowerCase()}">${finding.severity}</div>
        </div>
        <div class="finding-description">${finding.description || "No description"}</div>
        <div class="finding-location">${finding.location || "Unknown location"}</div>
        <div class="finding-context">${finding.context || ""}</div>
      `

      findingsList.appendChild(findingItem)
    })
  }

  // Back to scan button
  if (backToScanBtn) {
    backToScanBtn.addEventListener("click", () => {
      scanResults.classList.add("hidden")
      shadowDataForm.closest(".shadow-data-scan").classList.remove("hidden")
    })
  }

  // Download report button
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener("click", () => {
      if (!currentReport) {
        alert("No report data available")
        return
      }

      // Create report content
      const reportContent = generateReportContent(currentReport)

      // Create download link
      const blob = new Blob([reportContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `shadow-data-report-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  // Generate report content for download
  function generateReportContent(report) {
    let content = "SHADOW DATA SCAN REPORT\n"
    content += "=======================\n\n"

    content += `Date: ${new Date(report.createdAt || Date.now()).toLocaleString()}\n`
    content += `Scan Type: ${report.scanType || "Shadow Data"}\n\n`

    content += "SUMMARY\n-------\n"
    content += `${report.summary}\n\n`

    content += "FINDINGS\n--------\n"
    if (!report.findings || report.findings.length === 0) {
      content += "No shadow data detected.\n"
    } else {
      report.findings.forEach((finding, index) => {
        content += `[${index + 1}] ${finding.type} (${finding.severity})\n`
        content += `Description: ${finding.description}\n`
        content += `Location: ${finding.location}\n`
        if (finding.context) {
          content += `Context: ${finding.context}\n`
        }
        content += "\n"
      })
    }

    content += "\nEND OF REPORT\n"

    return content
  }

  // Logout
  const logoutLink = document.getElementById("logout-link")
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault()

      try {
        const response = await fetch("/auth/logout")

        // Add response validation
        if (!response.ok) {
          throw new Error(`Logout failed: ${response.status} ${response.statusText}`)
        }

        // Check content type to avoid parsing HTML as JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("Response is not JSON, redirecting to login page")
          window.location.href = "/"
          return
        }

        const data = await response.json()

        if (data.success) {
          window.location.href = "/"
        }
      } catch (err) {
        console.error("Error during logout:", err)
        alert("An error occurred during logout. Redirecting to login page.")
        // Redirect anyway in case of error
        window.location.href = "/"
      }
    })
  }
})


document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  const scanLink = document.getElementById("scan-link")
  const reportsLink = document.getElementById("reports-link")
  const logoutLink = document.getElementById("logout-link")
  const startScanBtn = document.getElementById("start-scan-btn")
  const viewReportsBtn = document.getElementById("view-reports-btn")

  const welcomeSection = document.getElementById("welcome-section")
  const scanSection = document.getElementById("scan-section")
  const reportsSection = document.getElementById("reports-section")
  const reportDetailsSection = document.getElementById("report-details-section")

  // Show scan section
  if (scanLink) {
    scanLink.addEventListener("click", (e) => {
      e.preventDefault();
      const scanSection = document.getElementById("scan-section");
      if (scanSection) {
        hideAllSections();
        scanSection.classList.remove("hidden");
      }
    });
  }

  // Show reports section
  if (reportsLink) {
    reportsLink.addEventListener("click", (e) => {
      e.preventDefault();
      const reportsSection = document.getElementById("reports-section");
      if (reportsSection) {
        hideAllSections();
        reportsSection.classList.remove("hidden");
        loadReports();
      }
    });
  }

  // Start scan button
  if (startScanBtn) {
    startScanBtn.addEventListener("click", () => {
      const scanSection = document.getElementById("scan-section");
      if (scanSection) {
        hideAllSections();
        scanSection.classList.remove("hidden");
      }
    });
  }

  // View reports button
  if (viewReportsBtn) {
    viewReportsBtn.addEventListener("click", () => {
      const reportsSection = document.getElementById("reports-section");
      if (reportsSection) {
        hideAllSections();
        reportsSection.classList.remove("hidden");
        loadReports();
      }
    });
  }

  // Back to reports button
  const backToReportsBtn = document.getElementById("back-to-reports")
  if (backToReportsBtn) {
    backToReportsBtn.addEventListener("click", () => {
      if (reportsSection) {
        hideAllSections()
        reportsSection.classList.remove("hidden")
      }
    })
  }

   // Logout
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

  // Scan form submission
  const scanForm = document.getElementById("scan-form")
  if (scanForm) {
    scanForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const scanTypeElement = document.getElementById("scan-type")
      const fileTypeElement = document.getElementById("file-type")
      const codeSnippetElement = document.getElementById("code-snippet")

      if (!scanTypeElement || !fileTypeElement || !codeSnippetElement) {
        console.error("Scan form elements not found")
        return
      }

      const scanType = scanTypeElement.value
      const fileType = fileTypeElement.value
      const codeSnippet = codeSnippetElement.value

      if (!codeSnippet.trim()) {
        alert("Please enter a code snippet to scan")
        return
      }

      try {
        const response = await fetch(`/scan/${scanType}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ codeSnippet, fileType }),
        })

        const data = await response.json()

        if (data.success && reportDetailsSection) {
          hideAllSections()
          displayReportDetails(data.report)
          reportDetailsSection.classList.remove("hidden")
        } else {
          alert(data.message || "Scan failed")
        }
      } catch (err) {
        console.error(err)
        alert("An error occurred during the scan")
      }
    })
  }

  // Load reports
  async function loadReports() {
    const reportsList = document.getElementById("reports-list")

    // Check if reports list element exists
    if (!reportsList) {
      console.error("Reports list element not found")
      return
    }

    try {
      const response = await fetch("/report")
      const reports = await response.json()

      if (reports.length === 0) {
        reportsList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-file-alt"></i>
            <p>No reports found</p>
          </div>
        `
        return
      }

      reportsList.innerHTML = ""

      reports.forEach((report) => {
        const reportCard = document.createElement("div")
        reportCard.className = "report-card"
        reportCard.dataset.id = report._id

        // Get highest severity
        let highestSeverity = "Low"
        const severityOrder = ["Low", "Medium", "High", "Critical"]

        if (report.findings && report.findings.length > 0) {
          report.findings.forEach((finding) => {
            if (severityOrder.indexOf(finding.severity) > severityOrder.indexOf(highestSeverity)) {
              highestSeverity = finding.severity
            }
          })
        }

        const date = new Date(report.createdAt).toLocaleString()

        reportCard.innerHTML = `
          <div class="report-card-header">
            <div class="report-card-title">${report.title || "Untitled Report"}</div>
            <div class="report-card-date">${date}</div>
          </div>
          <div class="report-card-summary">${report.summary || "No summary available"}</div>
          <div class="report-card-footer">
            <div class="report-card-type">${report.scanType || "Unknown"}</div>
            <div class="report-card-severity">
              <div class="severity-dot severity-${highestSeverity.toLowerCase()}"></div>
              ${highestSeverity}
            </div>
          </div>
        `

        reportCard.addEventListener("click", () => {
          if (reportDetailsSection) {
            hideAllSections()
            displayReportDetails(report)
            reportDetailsSection.classList.remove("hidden")
          }
        })

        reportsList.appendChild(reportCard)
      })
    } catch (err) {
      console.error("Error loading reports:", err)

      // Check again if reportsList exists before setting innerHTML
      if (reportsList) {
        reportsList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading reports</p>
          </div>
        `
      }
    }
  }

  // Display report details
  function displayReportDetails(report) {
    const reportTitle = document.getElementById("report-title")
    const reportScanType = document.getElementById("report-scan-type")
    const reportDate = document.getElementById("report-date")
    const reportSummary = document.getElementById("report-summary")
    const findingsList = document.getElementById("findings-list")

    if (!reportTitle || !reportScanType || !reportDate || !reportSummary || !findingsList) {
      console.error("Report details elements not found")
      return
    }

    reportTitle.textContent = report.title || "Untitled Report"
    reportScanType.textContent = report.scanType || "Unknown"
    reportDate.textContent = report.createdAt ? new Date(report.createdAt).toLocaleString() : "Unknown date"
    reportSummary.textContent = report.summary || "No summary available"

    findingsList.innerHTML = ""

    if (!report.findings || report.findings.length === 0) {
      findingsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>No findings in this report</p>
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
      `

      findingsList.appendChild(findingItem)
    })
  }

  // Helper function to hide all sections
  function hideAllSections() {
    // Only add the hidden class if the element exists
    if (welcomeSection) welcomeSection.classList.add("hidden")
    if (scanSection) scanSection.classList.add("hidden")
    if (reportsSection) reportsSection.classList.add("hidden")
    if (reportDetailsSection) reportDetailsSection.classList.add("hidden")
  }

  // Load dashboard stats
  async function loadDashboardStats() {
    try {
      const totalScans = document.getElementById("total-scans")
      const totalVulnerabilities = document.getElementById("total-vulnerabilities")
      const totalKeywords = document.getElementById("total-keywords")
      const totalReports = document.getElementById("total-reports")

      // Only proceed if at least one of the elements exists
      if (!totalScans && !totalVulnerabilities && !totalKeywords && !totalReports) {
        console.log("Dashboard stat elements not found, skipping stats loading")
        return
      }

      const [reportsResponse, keywordsResponse] = await Promise.all([fetch("/report"), fetch("/keyword")])

      const reports = await reportsResponse.json()
      const keywords = await keywordsResponse.json()

      let vulnerabilitiesCount = 0
      reports.forEach((report) => {
        if (report.findings) {
          vulnerabilitiesCount += report.findings.length
        }
      })

      if (totalScans) totalScans.textContent = reports.length.toString()
      if (totalVulnerabilities) totalVulnerabilities.textContent = vulnerabilitiesCount.toString()
      if (totalKeywords) totalKeywords.textContent = keywords.length.toString()
      if (totalReports) totalReports.textContent = reports.length.toString()

      console.log("Dashboard stats loaded successfully")
    } catch (err) {
      console.error("Error loading dashboard stats:", err)
    }
  }

  // Initialize
  loadDashboardStats()
})


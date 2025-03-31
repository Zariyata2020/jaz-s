document.addEventListener("DOMContentLoaded", () => {
  // Settings navigation
  const settingsNavItems = document.querySelectorAll(".settings-nav li")
  const settingsSections = document.querySelectorAll(".settings-section")

  settingsNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      const sectionId = item.getAttribute("data-section")

      // Remove active class from all items and sections
      settingsNavItems.forEach((i) => i.classList.remove("active"))
      settingsSections.forEach((s) => s.classList.remove("active"))

      // Add active class to current item and section
      item.classList.add("active")
      document.getElementById(`${sectionId}-section`).classList.add("active")
    })
  })

  // Category tabs
  const categoryTabs = document.querySelectorAll(".category-tab")

  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const category = tab.getAttribute("data-category")

      // Remove active class from all tabs
      categoryTabs.forEach((t) => t.classList.remove("active"))

      // Add active class to current tab
      tab.classList.add("active")

      // Update hidden input
      const categoryInput = document.getElementById("keyword-category")
      if (categoryInput) {
        categoryInput.value = category
      }

      // Load keywords for this category
      loadKeywords(category)
    })
  })

  // Add keyword form
  const addKeywordForm = document.getElementById("add-keyword-form")
  if (addKeywordForm) {
    addKeywordForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const wordInput = document.getElementById("new-keyword")
      const categoryInput = document.getElementById("keyword-category")

      if (!wordInput || !categoryInput) {
        console.error("Keyword form elements not found")
        return
      }

      const word = wordInput.value
      const category = categoryInput.value

      if (!word.trim()) {
        alert("Please enter a keyword")
        return
      }

      try {
        // Show loading state
        const submitBtn = addKeywordForm.querySelector("button[type='submit']")
        const originalBtnText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = "Adding..."

        console.log("Submitting keyword:", { word, category })

        const response = await fetch("/keyword", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ word, category }),
        })

        const responseText = await response.text()
        console.log("Response text:", responseText)

        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Error parsing response:", parseError)
          throw new Error("Invalid response from server")
        }

        if (!response.ok) {
          throw new Error(data.message || "Failed to add keyword")
        }

        wordInput.value = ""
        loadKeywords(category)

        // Reset button
        submitBtn.disabled = false
        submitBtn.textContent = originalBtnText
      } catch (err) {
        console.error("Error adding keyword:", err)
        alert(err.message || "An error occurred while adding the keyword")

        // Reset button state
        const submitBtn = addKeywordForm.querySelector("button[type='submit']")
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Add"
        }
      }
    })
  }

  // Load keywords
  async function loadKeywords(category) {
    const keywordsList = document.getElementById("keywords-list")
    if (!keywordsList) {
      console.error("Keywords list element not found")
      return
    }

    try {
      const response = await fetch("/keyword")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const keywords = await response.json()

      // Filter by category
      const filteredKeywords = keywords.filter((k) => k.category.toLowerCase() === category.toLowerCase())

      if (filteredKeywords.length === 0) {
        keywordsList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-key"></i>
            <p>No keywords found for this category</p>
          </div>
        `
        return
      }

      keywordsList.innerHTML = ""

      filteredKeywords.forEach((keyword) => {
        const keywordItem = document.createElement("div")
        keywordItem.className = "keyword-item"
        keywordItem.dataset.id = keyword._id

        keywordItem.innerHTML = `
          <div class="keyword-text">${keyword.word}</div>
          <div class="keyword-delete"><i class="fas fa-times"></i></div>
        `

        const deleteBtn = keywordItem.querySelector(".keyword-delete")
        if (deleteBtn) {
          deleteBtn.addEventListener("click", async () => {
            try {
              const response = await fetch(`/keyword/${keyword._id}`, {
                method: "DELETE",
              })

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
              }

              const data = await response.json()

              if (data.success) {
                keywordItem.remove()

                // Check if list is empty
                if (keywordsList.children.length === 0) {
                  keywordsList.innerHTML = `
                    <div class="empty-state">
                      <i class="fas fa-key"></i>
                      <p>No keywords found for this category</p>
                    </div>
                  `
                }
              } else {
                alert(data.message || "Failed to delete keyword")
              }
            } catch (err) {
              console.error("Error deleting keyword:", err)
              alert("An error occurred while deleting the keyword")
            }
          })
        }

        keywordsList.appendChild(keywordItem)
      })
    } catch (err) {
      console.error("Error loading keywords:", err)
      keywordsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading keywords</p>
        </div>
      `
    }
  }

  // Theme options
  const themeOptions = document.querySelectorAll(".theme-option")

  themeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const theme = option.getAttribute("data-theme")
      console.log("Changing theme to:", theme)

      // Remove active class from all options
      themeOptions.forEach((o) => o.classList.remove("active"))

      // Add active class to current option
      option.classList.add("active")

      // Apply theme - remove all theme classes first
      document.body.className = document.body.className
        .split(" ")
        .filter((cls) => !cls.startsWith("theme-"))
        .join(" ")

      // Add the new theme class
      document.body.classList.add(`theme-${theme}`)

      // Save to localStorage
      localStorage.setItem("theme", theme)
      console.log("Theme saved to localStorage:", theme)
    })
  })

  // Animations toggle
  const animationsToggle = document.getElementById("animations-toggle")
  if (animationsToggle) {
    animationsToggle.addEventListener("change", () => {
      if (animationsToggle.checked) {
        document.body.classList.remove("no-animations")
        localStorage.setItem("animations", "enabled")
      } else {
        document.body.classList.add("no-animations")
        localStorage.setItem("animations", "disabled")
      }
    })
  }

  // Profile form
  const profileForm = document.getElementById("profile-form")
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const usernameInput = document.getElementById("profile-username")
      const emailInput = document.getElementById("profile-email")
      const companyInput = document.getElementById("profile-company")
      const passwordInput = document.getElementById("profile-password")

      if (!usernameInput || !emailInput || !companyInput || !passwordInput) {
        console.error("Profile form elements not found")
        return
      }

      const username = usernameInput.value
      const email = emailInput.value
      const company = companyInput.value
      const password = passwordInput.value

      // Simple validation
      if (!username.trim() || !email.trim() || !company.trim()) {
        alert("Please fill in all required fields")
        return
      }

      try {
        const response = await fetch("/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            company,
            password: password.trim() ? password : undefined,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Profile update error response:", errorText)

          // Try to parse as JSON, but handle case where it's HTML
          let errorMessage
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.message || "Failed to update profile"
          } catch (e) {
            errorMessage = "Server returned an invalid response. Please try again later."
          }

          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success) {
          alert("Profile updated successfully")
          // Clear password field
          passwordInput.value = ""
        } else {
          alert(data.message || "Failed to update profile")
        }
      } catch (err) {
        console.error("Error updating profile:", err)
        alert(err.message || "An error occurred while updating your profile")
      }
    })
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

  // Initialize
  const initialCategory = document.querySelector(".category-tab.active")?.getAttribute("data-category") || "bola"
  loadKeywords(initialCategory)

  // Load saved theme
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme) {
    console.log("Loading saved theme from localStorage:", savedTheme)

    // Remove all theme classes first
    document.body.className = document.body.className
      .split(" ")
      .filter((cls) => !cls.startsWith("theme-"))
      .join(" ")

    // Add the saved theme class
    document.body.classList.add(`theme-${savedTheme}`)

    // Update the active theme option
    themeOptions.forEach((option) => {
      if (option.getAttribute("data-theme") === savedTheme) {
        option.classList.add("active")
      } else {
        option.classList.remove("active")
      }
    })
  }

  // Load saved animation preference
  const savedAnimations = localStorage.getItem("animations")
  if (savedAnimations === "disabled" && animationsToggle) {
    animationsToggle.checked = false
    document.body.classList.add("no-animations")
  }
})


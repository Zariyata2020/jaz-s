document.addEventListener("DOMContentLoaded", () => {
    // Tab switching
    const tabs = document.querySelectorAll(".tab")
    const tabPanes = document.querySelectorAll(".tab-pane")
  
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.getAttribute("data-tab")
  
        // Remove active class from all tabs and panes
        tabs.forEach((t) => t.classList.remove("active"))
        tabPanes.forEach((p) => p.classList.remove("active"))
  
        // Add active class to current tab and pane
        tab.classList.add("active")
        document.getElementById(tabId).classList.add("active")
      })
    })
  
    // Login form submission
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    console.log("Submitting login:", { email });

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("An error occurred during login: " + err.message);
    }
  });
}
  
    // Register form submission
    const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const company = document.getElementById("register-company").value;

    console.log("Submitting registration:", { username, email, company });

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, company }),
      });

      const data = await response.json();
      console.log("Registration response:", data);

      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("An error occurred during registration: " + err.message);
    }
  });
}
  })
  
  
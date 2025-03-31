const fs = require("fs")
const path = require("path")

// List of expected route files
const expectedRoutes = [
  "index.js",
  "auth.js",
  "scan.js",
  "report.js",
  "keyword.js",
  "api-security.js",
  "shadow-data.js",
]

// Check if routes directory exists
const routesDir = path.join(__dirname, "routes")
console.log(`Routes directory exists: ${fs.existsSync(routesDir)}`)

// Check each route file
if (fs.existsSync(routesDir)) {
  console.log("\nChecking route files:")
  expectedRoutes.forEach((file) => {
    const filePath = path.join(routesDir, file)
    const exists = fs.existsSync(filePath)
    console.log(`${exists ? "✓" : "✗"} ${file} ${exists ? "exists" : "does not exist"}`)

    if (exists) {
      // Check if file is readable
      try {
        const content = fs.readFileSync(filePath, "utf8")
        const hasExport = content.includes("module.exports")
        console.log(`  - Has module.exports: ${hasExport ? "Yes" : "No"}`)
      } catch (err) {
        console.error(`  - Error reading file: ${err.message}`)
      }
    }
  })

  // List all files in routes directory
  console.log("\nAll files in routes directory:")
  const files = fs.readdirSync(routesDir)
  files.forEach((file) => {
    console.log(`- ${file}`)
  })
}


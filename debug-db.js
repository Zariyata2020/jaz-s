const mongoose = require("mongoose")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/jazs_security"

async function debugDatabase() {
  try {
    console.log("Connecting to MongoDB:", MONGODB_URI)
    await mongoose.connect(MONGODB_URI)
    console.log("MongoDB connected successfully")

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log("\nCollections in database:")
    collections.forEach((collection) => {
      console.log(`- ${collection.name}`)
    })

    // Check if Keyword model exists
    const Keyword = require("./models/Keyword")
    console.log("\nKeyword model loaded successfully")

    // Count keywords
    const keywordCount = await Keyword.countDocuments()
    console.log(`Total keywords in database: ${keywordCount}`)

    // Check if User model exists
    const User = require("./models/User")
    console.log("\nUser model loaded successfully")

    // Count users
    const userCount = await User.countDocuments()
    console.log(`Total users in database: ${userCount}`)

    // Check if Report model exists
    const Report = require("./models/Report")
    console.log("\nReport model loaded successfully")

    // Count reports
    const reportCount = await Report.countDocuments()
    console.log(`Total reports in database: ${reportCount}`)

    console.log("\nDatabase connection and models are working correctly")
  } catch (err) {
    console.error("Database error:", err)
  } finally {
    await mongoose.disconnect()
    console.log("Disconnected from MongoDB")
  }
}

debugDatabase()


require('dotenv').config();
const express = require("express")
const path = require("path")
const session = require("express-session")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const User = require("./models/User")
const Keyword = require("./models/Keyword")
const Report = require("./models/Report")
const authRoutes = require("./routes/auth")
const scanRoutes = require("./routes/scan")
const reportRoutes = require("./routes/report")
const keywordRoutes = require("./routes/keyword")
const apiSecurityRoutes = require("./routes/apiSecurity")
const shadowDataRoutes = require("./routes/shadowData")

const app = express()
const PORT = process.env.PORT || 3000

console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set (value hidden for security)' : 'Not set');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Atlas connected"))
  .catch((err) => console.log(err))
  
// Middleware
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: false, limit: "50mb" }))
app.use(express.static(path.join(__dirname, "public")))
app.use(
  session({
    secret: "jazs_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }, // 1 hour
  }),
)

// Set view engine
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// Routes
app.use("/", require("./routes/index"))
app.use("/auth", authRoutes)
app.use("/scan", scanRoutes)
app.use("/report", reportRoutes)
app.use("/keyword", keywordRoutes)
app.use("/api-security", apiSecurityRoutes)
app.use("/shadow-data", shadowDataRoutes)

// Home route
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard")
  }
  res.render("index")
})

// Dashboard route
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/")
  }
  res.render("dashboard", { user: req.session.user })
})

// Settings route
app.get("/settings", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/")
  }
  res.render("settings", { user: req.session.user })
})

// API Security route
app.get("/api-security", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/")
  }
  res.render("api-security", { user: req.session.user })
})

// Shadow Data route
app.get("/shadow-data", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/")
  }
  res.render("shadow-data", { user: req.session.user })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})


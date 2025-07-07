const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const usersRoutes = require("./routes/usersRoutes");
const basicRoute = require("./routes/basicRoutes");

const app = express();

// Middleware
app.use(express.json()); // for JSON bodies
app.use(express.urlencoded({ extended: true })); // for form data

// CRORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Routes
app.use("/api/users", usersRoutes);
app.use("/api/basic", basicRoute);

// Root route
app.get("/", (req, res) => {
  res.send("API is running");
});

//Error Handle
app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

// Start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(process.env.PORT || 5001);
  })
  .catch((err) => {
    console.log(err);
  });

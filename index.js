const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const usersRoutes = require("./routes/usersRoutes");
const basicRoute = require("./routes/basicRoutes");
const poolRoute = require("./routes/poolRoute");

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
app.use("/api/pool", poolRoute);

// Root route
app.get("/", (req, res) => {
  res.send("API is running");
});

//Error Handle
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error); // let Express handle it

  // Duplicate key (Mongo)
  if (error?.code === 11000 || error?.code === 11001) {
    const fields = Object.keys(error.keyPattern || {});
    return res.status(409).json({
      message: `Duplicate value for ${fields.join(", ") || "unique field"}.`,
    });
  }

  // Invalid ObjectId, etc.
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format." });
  }

  // Mongoose validation
  if (error?.name === "ValidationError") {
    const details = Object.values(error.errors || {}).map((e) => e.message);
    return res.status(422).json({ message: "Validation failed.", details });
  }

  // Bad JSON body
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Malformed JSON." });
  }

  // JWT errors (if you use auth)
  if (error?.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token." });
  }
  if (error?.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired." });
  }

  // Multer/file upload errors (if you later add multer)
  if (error?.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${error.code}` });
  }

  // Default
  const status = error.code && Number.isInteger(error.code) ? error.code : 500;
  return res.status(status).json({
    message: error.message || "An unknown error occurred!",
  });
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

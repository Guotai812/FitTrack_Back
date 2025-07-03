const express = require("express");
const { check } = require("express-validator");

const usersControllers = require("../controllers/usersControllers");

const router = express.Router();

router.post(
  "/signup",
  [
    check("userName").not().isEmpty().withMessage("Username is required"),
    check("email").normalizeEmail().isEmail().withMessage("Invalid email"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  usersControllers.signup
);

router.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail().withMessage("Invalid email"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  usersControllers.login
);

module.exports = router;

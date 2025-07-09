const express = require("express");
const { check } = require("express-validator");
const basicControllers = require("../controllers/basicControllers");

const router = express.Router();

router.post(
  "/",
  [
    check("id").notEmpty().withMessage("id is required"),
    check("weight")
      .notEmpty()
      .withMessage("Weight is required")
      .bail()
      .isFloat({ gt: 0 })
      .withMessage("Weight must be a positive number"),
    check("height")
      .notEmpty()
      .withMessage("Height is required")
      .bail()
      .isFloat({ gt: 0 })
      .withMessage("Height must be a positive number"),
    check("frequency").not().isEmpty().withMessage("frequency is required"),
    check("type").notEmpty().withMessage("type is required"),
    check("gender").notEmpty().withMessage("gender is required"),
    check("goal").notEmpty().withMessage("goal is required"),
  ],
  basicControllers.addBasicInformation
);

router.get("/user/:uid", basicControllers.getUsersData);

module.exports = router;

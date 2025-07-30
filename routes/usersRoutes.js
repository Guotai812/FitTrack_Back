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

router.get("/:uid", usersControllers.getUserById);

// TODO: add route to handle the request to retrieve latest exercise data of certain user
router.get("/:uid/:eid/:type/getExerciseHis", usersControllers.getExerciseHis);

module.exports = router;

require("dotenv").config();
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const HttpError = require("../models/HttpError");

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const { userName, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("findone failed", 422));
  }
  if (existingUser) {
    return next(
      new HttpError("User exists already, please login instead", 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError("Could not create users", 500));
  }

  const createdUser = new User({
    name: userName,
    email,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
  } catch (error) {
    return next(new HttpError("Sign up failed", 500));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Sign up failed", 500));
  }

  res
    .status(200)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const { email, password } = req.body;

  let identifiedUser;
  try {
    identifiedUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Could not login", 500));
  }

  let isPasswordValid;
  try {
    isPasswordValid = await bcrypt.compare(password, identifiedUser.password);
  } catch (error) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        500
      )
    );
  }
  if (!isPasswordValid) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        401
      )
    );
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: identifiedUser.id,
        email: identifiedUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Login failed", 500));
  }
  res.status(200).json({
    userId: identifiedUser.userId,
    email: identifiedUser.email,
    token: token,
  });
};

exports.signup = signup;
exports.login = login;

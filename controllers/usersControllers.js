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
    isCompleted: false,
  });

  try {
    await createdUser.save();
  } catch (error) {
    return next(new HttpError("Signup Failed", 500));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        userName: createdUser.name,
        email: createdUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Sign up failed", 500));
  }

  res.status(200).json({
    userId: createdUser.id,
    userName: createdUser.name,
    isCompleted: createdUser.isCompleted,
    email: createdUser.email,
    token: token,
  });
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
    console.log("dataBase wrong");
    return next(new HttpError("Could not login", 500));
  }

  if (!identifiedUser) {
    console.log("can't find email");
    return next(new HttpError("email does not exist!", 401));
  }

  let isPasswordValid;
  try {
    isPasswordValid = await bcrypt.compare(password, identifiedUser.password);
  } catch (error) {
    console.log("bcrypt crash");
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        500
      )
    );
  }
  if (!isPasswordValid) {
    return next(new HttpError("Invalid password.", 401));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: identifiedUser.id,
        userName: identifiedUser.name,
        email: identifiedUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    console.log("token crash");
    return next(new HttpError("Login failed", 500));
  }
  res.status(200).json({
    userId: identifiedUser.id,
    userName: identifiedUser.name,
    isCompleted: identifiedUser.isCompleted,
    email: identifiedUser.email,
    token: token,
  });
};

const getUserById = async (req, res, next) => {
  const userId = req.params.uid;
  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    console.log("couldn't get user by id");
    return next(new HttpError("Couldn't get user by id", 500));
  }
  if (!user) {
    console.log("User not exist");
    return next(new HttpError("User not exist", 404));
  }
  return res.status(200).json({ message: "succeed", user });
};

const getExerciseHis = async (req, res, next) => {
  const { uid, eid } = req.params;
  let existingUser;
  try {
    existingUser = await User.findById(uid);
    if (!existingUser) return next(new HttpError("User does not exist!", 404));
  } catch (error) {
    return next(new HttpError("Failed to get latest data", 500));
  }
  const { type } = req.body;
  const { exercises } = existingUser;
  if (type === "aerobic") {
    const aerobicList = exercises.aerobic || null;
    const selectedExercise = aerobicList === null ? [] : aerobicList[eid];
    return res.status(200).json({ msg: "succeed", data: selectedExercise });
  }
  const anaerobicList = exercises.anaerobic || null;
  const selectedExercise = anaerobicList === null ? [] : anaerobicList[eid];
  return res.status(200).json({ msg: "succeed", data: selectedExercise });
};

exports.signup = signup;
exports.login = login;
exports.getUserById = getUserById;
exports.getExerciseHis = getExerciseHis;

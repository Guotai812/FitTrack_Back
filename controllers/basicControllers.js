require("dotenv").config();
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Basic = require("../models/Basic");
const User = require("../models/User");
const HttpError = require("../models/HttpError");
const { json } = require("express");

const addBasicInformation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return next(new HttpError(errors.array()[0].msg, 400));
  }

  const { userId, weight, height, frequency, type, gender, goal, birthdate } =
    req.body;

  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();

  const freMultiplier =
    frequency === "0"
      ? 1.2
      : frequency === "1-3"
      ? 1.375
      : frequency === "3-5"
      ? 1.55
      : frequency === "over 5"
      ? 1.725
      : 1;
  const TDEE =
    gender === "male"
      ? (10 * weight + 6.25 * height - 5 * age) * freMultiplier
      : (10 * weight + 6.25 * height - 5 * age - 161) * freMultiplier;

  const kcal = Math.round(
    goal === "keep fit" ? TDEE : goal === "lose fat" ? TDEE - 300 : TDEE + 300
  );
  const basicInfo = new Basic({
    userId,
    weight,
    height,
    frequency,
    type,
    gender,
    birthdate,
    age,
    goal,
    kcal,
    date: new Date().toISOString().slice(0, 10),
  });

  let user;
  try {
    user = await User.findById(userId);
  } catch {
    return next(new HttpError("Fail to add info", 500));
  }
  if (!user || user.isCompleted) {
    return next(new HttpError("User is not exist or is completed", 404));
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await basicInfo.save({ session });
    user.isCompleted = true;
    user.kcal = kcal;
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new HttpError("Fail to add info", 500));
  }

  return res.status(200).json({ msg: "Added successfully" });
};

const getInfoByUserId = async (req, res, next) => {
  // 1. validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 400));
  }

  const { uid } = req.params;

  // 2. ensure user exists
  let user;
  try {
    user = await User.findById(uid).exec();
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Failed to fetch user", 500));
  }

  // 3. fetch basic info
  let info;
  try {
    info = await Basic.findOne({ userId: uid }).exec();
    if (!info) {
      return next(new HttpError("User info not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Failed to fetch user info", 500));
  }

  // 4. destructure and respond
  const { weight, height, frequency, goal, birthdate, type, kcal } = info;
  return res
    .status(200)
    .json({ weight, height, frequency, goal, birthdate, type, kcal });
};

exports.addBasicInformation = addBasicInformation;
exports.getInfoByUserId = getInfoByUserId;

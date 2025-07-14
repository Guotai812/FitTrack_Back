require("dotenv").config();
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Basic = require("../models/Basic");
const User = require("../models/User");
const HttpError = require("../models/HttpError");

const addBasicInformation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return next(new HttpError(errors.array()[0].msg, 400));
  }

  const { userId, weight, height, frequency, type, gender, goal, age } =
    req.body;

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

  const calories =
    goal === "keep fit" ? TDEE : goal === "lose fat" ? TDEE - 300 : TDEE + 300;
  const basicInfo = new Basic({
    userId,
    weight,
    height,
    frequency,
    type,
    gender,
    age,
    goal,
    calories,
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

exports.addBasicInformation = addBasicInformation;

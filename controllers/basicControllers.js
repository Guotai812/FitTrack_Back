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

  const { userId, weight, height, frequency, type, gender, goal } = req.body;

  const basicInfo = new Basic({
    userId,
    weight,
    height,
    frequency,
    type,
    gender,
    goal,
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

require("dotenv").config();
const { validationResult } = require("express-validator");
const Basic = require("../models/Basic");

const User = require("../models/User");
const HttpError = require("../models/HttpError");

const addBasicInformation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return next(new HttpError(errors.array()[0].msg, 400));
  }

  const { id, weight, height, frequency, type, gender, goal } = req.body;

  const basicInfo = new Basic({
    id,
    weight,
    height,
    frequency,
    type,
    gender,
    goal,
  });

  try {
    await basicInfo.save();
  } catch (error) {
    return next(new HttpError("Add information failed", 500));
  }
  return res.status(200).json({ msg: "Added successfully" });
};

const getUsersData = async (req, res, next) => {
  const userId = req.params.uid;
  let existingUserInfo;
  try {
    existingUserInfo = await Basic.findOne({ userId });
  } catch (error) {
    console.log("get infor of user | database error");
    return next(new HttpError("database error"));
  }
  if (!existingUserInfo) {
    console.log(`can't find data of ${userId}`);
    return next(new HttpError("no results!"));
  }
  return res.status(200).json({ message: "success", data: existingUserInfo });
};

exports.addBasicInformation = addBasicInformation;
exports.getUsersData = getUsersData;

require("dotenv").config();
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const toCamelCase = require("../utils/toCamelCase");

const Basic = require("../models/Basic");
const User = require("../models/User");
const Food = require("../models/Food");
const HttpError = require("../models/HttpError");

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
    user.height = height;
    user.weight = weight;
    user.birthdate = birthdate;
    user.type = type;
    user.goal = goal;
    user.frequency = frequency;
    user.age = age;
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
    info = await Basic.findOne({
      userId: uid,
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Australia/Sydney",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    }).exec();
    if (!info) {
      info = new Basic({
        weight: user.weight,
        height: user.height,
        kcal: user.kcal,
        date: new Intl.DateTimeFormat("en-CA", {
          timeZone: "Australia/Sydney",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
        userId: uid,
      });
      info.save();
    }
  } catch (err) {
    return next(new HttpError("Failed to fetch user info", 500));
  }

  // 4. destructure and respond
  const { weight, height, kcal, diets, exercises, date } = info;
  return res.status(200).json({ weight, height, kcal, diets, exercises, date });
};

const getPoolById = async (req, res, next) => {
  const { uid } = req.params;
  if (!uid) {
    return res.status(400).json({ message: "Missing user ID in parameters." });
  }

  try {
    const foodsArray = await Food.find({
      $or: [{ creator: "official" }, { creator: uid }],
    }).lean();

    if (!foodsArray.length) {
      throw new Error();
    }

    const pool = foodsArray.reduce((map, food) => {
      const key = toCamelCase(food.name);
      map[key] = food;
      return map;
    }, {});

    return res.status(200).json(pool);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not fetch food pool." });
  }
};

exports.addBasicInformation = addBasicInformation;
exports.getInfoByUserId = getInfoByUserId;
exports.getPoolById = getPoolById;

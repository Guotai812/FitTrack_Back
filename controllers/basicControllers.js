require("dotenv").config();
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const toCamelCase = require("../utils/toCamelCase");

const Basic = require("../models/Basic");
const User = require("../models/User");
const Food = require("../models/Food");
const Exercise = require("../models/Exercise");
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
    currentKcal: kcal,
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
        kcal: user.kcal,
        weight: user.weight,
        height: user.height,
        currentKcal: user.kcal,
        date: new Intl.DateTimeFormat("en-CA", {
          timeZone: "Australia/Sydney",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
        userId: uid,
      });
      await info.save();
    }
  } catch (err) {
    return next(new HttpError(err, 500));
  }

  // 4. destructure and respond
  const { weight, height, kcal, diets, exercises, date, currentKcal } = info;
  return res
    .status(200)
    .json({ weight, height, kcal, diets, exercises, date, currentKcal });
};

const getPoolById = async (req, res, next) => {
  const { uid } = req.params;
  if (!uid) {
    return next(new HttpError("Missing user ID in parameters.", 400));
  }

  try {
    const [foodsArray, exercisesArray] = await Promise.all([
      Food.find({
        isPublic: true,
        $or: [{ creator: "official" }, { creator: uid }],
      }).lean(),
      Exercise.find({
        isPublic: true,
        $or: [{ creator: "official" }, { creator: uid }],
      }).lean(),
    ]);

    // If there’s nothing to return at all
    if (foodsArray.length === 0 && exercisesArray.length === 0) {
      return res
        .status(404)
        .json({ message: "No public foods or exercises found." });
    }

    const foods = foodsArray.reduce((map, item) => {
      map[item._id.toString()] = item;
      return map;
    }, {});

    const exercises = exercisesArray.reduce((map, item) => {
      map[item._id.toString()] = item;
      return map;
    }, {});

    return res.status(200).json({ foods, exercises });
  } catch (error) {
    console.error("getPoolById error:", error);
    return next(
      new HttpError("Internal server error while fetching pool.", 500)
    );
  }
};

const addUserDiet = async (req, res, next) => {
  const { uid } = req.params;

  // 1) Validate User ID
  if (!mongoose.Types.ObjectId.isValid(uid)) {
    return next(new HttpError("Invalid user ID", 400));
  }

  // 2) Ensure user exists
  let user;
  try {
    user = await User.findById(uid);
  } catch (err) {
    console.error("DB error finding user:", err);
    return next(new HttpError("Server error", 500));
  }
  if (!user) {
    return next(new HttpError("User not found", 404));
  }

  // 3) Compute today’s date as 'YYYY-MM-DD'
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 4) Find today’s Basic record
  let record;
  try {
    record = await Basic.findOne({ userId: uid, date: today });
  } catch (err) {
    console.error("DB error finding Basic record:", err);
    return next(new HttpError("Server error", 500));
  }
  if (!record) {
    return next(new HttpError("No diet record for today", 404));
  }

  // 5) Extract & coerce payload
  let { name, weight: w, kcal: k, meal, isMain } = req.body;
  const weight = Number(w);
  const kcal = Number(k);

  // 6) Validate inputs
  if (
    !name ||
    isNaN(weight) ||
    isNaN(kcal) ||
    !["breakfast", "lunch", "dinner"].includes(meal) ||
    typeof isMain !== "boolean"
  ) {
    return next(new HttpError("Missing or invalid fields", 400));
  }

  // 7) Ensure the nested path exists
  if (!record.diets) {
    record.diets = {};
  }
  if (!record.diets[meal]) {
    record.diets[meal] = { main: [], extra: [] };
  }

  const path = isMain ? "main" : "extra";
  const slotArr = record.diets[meal][path];

  // 8) Merge same-item or push new
  const existing = slotArr.find((entry) => entry.food === name);
  if (existing) {
    existing.weight += weight;
  } else {
    slotArr.push({ food: name, weight });
  }

  // 9) Subtract calories
  record.currentKcal -= kcal;

  // 10) Mark modified & save
  // (if `diets` is a Mixed type, Mongoose needs this)
  record.markModified("diets");
  try {
    await record.save();
  } catch (err) {
    console.error("DB error saving Basic record:", err);
    return next(new HttpError("Failed to update diet", 500));
  }

  // 11) Return updated record
  res.status(200).json(record);
};

const editDiet = async (req, res, next) => {
  const { uid } = req.params;

  // 1) Find user
  let existingUser;
  try {
    existingUser = await User.findById(uid);
  } catch (error) {
    console.error("editDiet – error finding user:", error);
    return next(new HttpError("Failed to update data", 500));
  }
  if (!existingUser) {
    console.warn("editDiet – user not found:", uid);
    return next(new HttpError("Failed to update data", 404));
  }

  // 2) Find today's record
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let record;
  try {
    record = await Basic.findOne({ userId: uid, date: today });
  } catch (error) {
    console.error("editDiet – DB error finding Basic record:", error);
    return next(new HttpError("Server error", 500));
  }
  if (!record) {
    console.warn("editDiet – no record for today:", today);
    return next(new HttpError("No diet record for today", 404));
  }

  // 3) Destructure request body
  const { food, meal, isMain, weight, originalWeight } = req.body;

  // 4) Load food doc (and kcal)
  let foodDoc;
  try {
    foodDoc = await Food.findById(food);
  } catch (error) {
    console.error("editDiet – error loading Food doc:", error);
    return next(new HttpError("Failed to update", 500));
  }
  if (!foodDoc) {
    console.warn("editDiet – food not found:", food);
    return next(new HttpError("Food not found", 404));
  }

  // 5) Compute caloric delta (one decimal)
  const gap = Number(originalWeight) - Number(weight);
  const raw = (gap / 100) * foodDoc.kcal;
  const gapKcal = Math.round(raw * 10) / 10;

  // 6) Locate and update the diet entry
  const side = isMain ? "main" : "extra";
  const list = record.diets?.[meal]?.[side];
  if (!Array.isArray(list)) {
    console.error("editDiet – unexpected structure for", meal, side);
    return next(new HttpError("Invalid meal type", 400));
  }

  const entry = list.find(
    (item) =>
      // if item.food is an ObjectId, compare strings:
      item.food.toString() === food
  );
  if (!entry) {
    console.warn(`editDiet – no entry for food ${food} in ${meal}.${side}`);
    return next(new HttpError("No such food entry in your diet", 400));
  }

  entry.weight = Number(weight);

  // 7) Update remaining calories
  record.currentKcal = (record.currentKcal ?? 0) + gapKcal;

  // 8) Save and respond
  try {
    await record.save();
  } catch (error) {
    console.error("editDiet – error saving record:", error);
    return next(new HttpError("Failed to update diet", 500));
  }

  res.status(200).json({ msg: "success", updated: record });
};

const deleteDiet = async (req, res, next) => {
  const { uid, foodId } = req.params;

  let existingUser;
  try {
    existingUser = await User.findById(uid);
  } catch (error) {
    console.error("editDiet – error finding user:", error);
    return next(new HttpError("Failed to update data", 500));
  }
  if (!existingUser) {
    console.warn("editDiet – user not found:", uid);
    return next(new HttpError("Failed to update data", 404));
  }

  // 2) Find today's record
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let record;
  try {
    record = await Basic.findOne({ userId: uid, date: today });
  } catch (error) {
    console.error("editDiet – DB error finding Basic record:", error);
    return next(new HttpError("Server error", 500));
  }
  if (!record) {
    console.warn("editDiet – no record for today:", today);
    return next(new HttpError("No diet record for today", 404));
  }

  const { meal, isMain, kcal } = req.body;
  const listKey = isMain ? "main" : "extra";
  let updated;
  try {
    updated = await Basic.findOneAndUpdate(
      { userId: uid, date: today },
      {
        $pull: {
          [`diets.${meal}.${listKey}`]: { food: foodId },
        },
        $inc: { currentKcal: kcal },
      },
      { new: true }
    );
  } catch (err) {
    console.error("deleteDiet – DB error:", err);
    return next(new HttpError("Could not update record", 500));
  }

  if (!updated) {
    return next(new HttpError("No record found for today", 404));
  }

  res.status(200).json({
    message: "Entry removed",
    updated,
  });
};

const addExercise = async (req, res, next) => {
  const { uid, eid } = req.params;
  const { type, duration, sets, kcal } = req.body;

  // 1) Compute today's date string in YYYY-MM-DD (Australia/Sydney)
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 2) Build the Mongo update for the Basic record
  const basicUpdate =
    type === "aerobic"
      ? {
          $push: { "exercises.aerobic": { eid, duration } },
          $inc: { currentKcal: kcal },
        }
      : {
          $push: { "exercises.anaerobic": { eid, sets } },
          $inc: { currentKcal: kcal },
        };

  // 3) Apply it and return the UPDATED document
  let updatedBasic;
  try {
    updatedBasic = await Basic.findOneAndUpdate(
      { userId: uid, date: today },
      basicUpdate,
      { new: true } // ← return the doc _after_ update
    ).lean();

    if (!updatedBasic) {
      return next(new HttpError("No daily record found for today", 404));
    }
  } catch (err) {
    console.error("Error updating Basic record:", err);
    return next(new HttpError(err, 500));
  }

  // 4) Also push into the User's history map (optional)
  try {
    const pushPath =
      type === "aerobic"
        ? `exercises.aerobic.${eid}`
        : `exercises.anaerobic.${eid}`;

    const pushValue = type === "aerobic" ? [today, duration] : [today, sets];

    await User.updateOne({ _id: uid }, { $push: { [pushPath]: pushValue } });
    // we won't fail the entire request if this history update errors
  } catch (err) {
    console.error("Error updating User history:", err);
  }

  // 5) Send back the full updated Basic doc
  res.status(200).json({
    msg: "succeed",
    updated: updatedBasic,
  });
};

exports.addBasicInformation = addBasicInformation;
exports.getInfoByUserId = getInfoByUserId;
exports.getPoolById = getPoolById;
exports.addUserDiet = addUserDiet;
exports.editDiet = editDiet;
exports.deleteDiet = deleteDiet;
exports.addExercise = addExercise;

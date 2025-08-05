require("dotenv").config();
const { randomUUID } = require("node:crypto");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { getCurrentKcal } = require("../utils/getCurrentKcal");

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

  const kcal =
    goal === "keep fit" ? TDEE : goal === "lose fat" ? TDEE - 300 : TDEE + 300;
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
    existing.weight = weight;
  } else {
    slotArr.push({ food: name, weight });
  }

  // 9) Subtract calories
  record.currentKcal = await getCurrentKcal(user.kcal, record);

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
  const { food, meal, isMain, weight } = req.body;

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

  entry.weight = weight;
  record.markModified("diets");
  // 7) Update remaining calories
  record.currentKcal = await getCurrentKcal(existingUser.kcal, record);

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

  const { meal, isMain } = req.body;
  const listKey = isMain ? "main" : "extra";
  let updated;
  try {
    updated = await Basic.findOneAndUpdate(
      { userId: uid, date: today },
      {
        $pull: {
          [`diets.${meal}.${listKey}`]: { food: foodId },
        },
      },
      { new: true }
    );
    const kcal = await getCurrentKcal(existingUser.kcal, updated);
    updated.currentKcal = kcal;
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
  const { type, duration, sets } = req.body;
  const rid = randomUUID();
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
          $push: { "exercises.aerobic": { eid, duration, rid } },
        }
      : {
          $push: { "exercises.anaerobic": { eid, sets, rid } },
        };

  // 3) Apply it and return the UPDATED document
  let updatedBasic;
  try {
    updatedBasic = await Basic.findOneAndUpdate(
      { userId: uid, date: today },
      basicUpdate,
      { new: true } // ← return the doc _after_ update
    );
    updatedBasic.currentKcal = await getCurrentKcal(
      existingUser.kcal,
      updatedBasic,
      existingUser.weight
    );
    updatedBasic.markModified("exercises");

    await updatedBasic.save();
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

    const pushValue =
      type === "aerobic" ? [today, duration, rid] : [today, sets, rid];

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

const deleteExercise = async (req, res, next) => {
  const { uid } = req.params;
  const { rid, type, eid, kcal } = req.body;
  let existingUser;
  try {
    existingUser = await User.findById(uid);
  } catch (error) {
    console.error("deleteExercise – error finding user:", error);
    return next(new HttpError("Failed to delete exercise", 500));
  }
  if (!existingUser) {
    console.warn("editDiet – user not found:", uid);
    return next(new HttpError("Failed to delete exercise", 404));
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
    return next(new HttpError("No exercise record for today", 404));
  }

  const updated = await Basic.findOneAndUpdate(
    { userId: uid, date: today },
    {
      $pull: { [`exercises.${type}`]: { eid, rid } },
    },
    { new: true }
  );
  updated.currentKcal = await getCurrentKcal(
    existingUser.kcal,
    updated,
    existingUser.weight
  );
  updated.markModified("exercise");
  await updated.save();
  // assuming you have: type = "aerobic" | "anaerobic", eid, rid, and userId (or uid)
  await User.findOneAndUpdate(
    { _id: uid }, // or { userId: uid } if that's your key
    [
      {
        $set: {
          [`exercises.${type}.${eid}`]: {
            $filter: {
              input: { $ifNull: [`$exercises.${type}.${eid}`, []] },
              as: "entry",
              cond: {
                $ne: [{ $arrayElemAt: ["$$entry", 2] }, rid], // keep entries whose rid ≠ target
              },
            },
          },
        },
      },
    ]
  ).lean();

  return res.status(200).json({ msg: "succeed", updated });
};

const updateExercise = async (req, res, next) => {
  const { uid } = req.params;
  const { rid, type, updatedValue, eid } = req.body;
  let existingUser;
  try {
    existingUser = await User.findById(uid);
  } catch (error) {
    console.error("updatedExercise – error finding user:", error);
    return next(new HttpError("Failed to update exercise", 500));
  }
  if (!existingUser) {
    console.warn("updatedExercise – user not found:", uid);
    return next(new HttpError("Failed to update exercise", 404));
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
    console.error("updatedExercise – DB error finding Basic record:", error);
    return next(new HttpError("Server error", 500));
  }
  if (!record) {
    console.warn("updatedExercise – no record for today:", today);
    return next(new HttpError("No exercise record for today", 404));
  }
  if (type === "aerobic") {
    const hisArray = existingUser.exercises.aerobic[eid];
    const idx = hisArray.findIndex((entry) => entry[2] === rid);
    if (idx === -1) throw new Error("rid not found");
    hisArray[idx][1] = updatedValue;
    existingUser.markModified(`exercises.aerobic.${eid}`);

    // fixed: same rid matching logic instead of entry.rid
    const arr = record.exercises.aerobic;
    if (!Array.isArray(arr)) {
      return next(
        new HttpError("Invalid eid or missing aerobic bucket in record", 400)
      );
    }
    const entry = arr.find((entry) => entry.rid === rid);
    if (!entry) {
      return next(new HttpError("Exercise entry not found", 404));
    }
    entry.duration = updatedValue;
    record.markModified(`exercises.aerobic`);
    try {
      record.currentKcal = await getCurrentKcal(
        existingUser.kcal,
        record,
        existingUser.weight
      );
    } catch (error) {
      return next(new HttpError(error, 500));
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const updated = await record.save({ session });
      await existingUser.save({ session });
      await session.commitTransaction();
      return res.status(200).json({ msg: "succeed", updated });
    } catch (error) {
      await session.abortTransaction();
      console.error("updatedExercise – DB error saving updated record:", error);
      return next(new HttpError(error, 500));
    } finally {
      await session.endSession();
    }
  } else if (type === "anaerobic") {
    const hisArr = existingUser.exercises.anaerobic[eid];
    const idx = hisArr.findIndex((e) => e[2] === rid);
    hisArr[idx][1] = updatedValue;
    existingUser.markModified(`exercises.anaerobic.${eid}`);

    const ex = record.exercises.anaerobic.find((e) => e.rid === rid);
    ex.sets = updatedValue;
    record.markModified(`exercises.anaaerobic`);
    try {
      record.currentKcal = await getCurrentKcal(
        existingUser.kcal,
        record,
        existingUser.weight
      );
    } catch (error) {
      return next(new HttpError(error, 500));
    }
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const updated = await record.save({ session });
      await existingUser.save({ session });
      await session.commitTransaction();
      return res.status(200).json({ msg: "succeed", updated });
    } catch (error) {
      console.error("updatedExercise – DB error saving updated record:", error);
      return next(new HttpError(error, 500));
    } finally {
      await session.endSession();
    }
  }
};

exports.addBasicInformation = addBasicInformation;
exports.getInfoByUserId = getInfoByUserId;
exports.getPoolById = getPoolById;
exports.addUserDiet = addUserDiet;
exports.editDiet = editDiet;
exports.deleteDiet = deleteDiet;
exports.addExercise = addExercise;
exports.deleteExercise = deleteExercise;
exports.updateExercise = updateExercise;

require("dotenv").config();
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const Food = require("../models/Food");
const User = require("../models/User");
const Exercise = require("../models/Exercise");

const HttpError = require("../models/HttpError");
const { default: mongoose } = require("mongoose");

// poolControllers.getPresignedUrl
exports.getPresignedUrl = async (req, res, next) => {
  try {
    const { uid, type } = req.params;
    const contentType = String(req.query.contentType || "");

    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(contentType)) {
      return next(new HttpError("Invalid content type", 400));
    }
    if (!uid) return next(new HttpError("User ID is required", 400));

    // enforce known pools
    const pool =
      type === "food"
        ? "foodPool"
        : type === "exercise"
        ? "exercisePool"
        : null;

    if (!pool) return next(new HttpError("Invalid type", 400));

    // extension from contentType
    const extMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[contentType] || "bin";

    const key = `${pool}/${uid}/${Date.now()}_${crypto
      .randomBytes(8)
      .toString("hex")}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // ACL: "private", // default is private; keep bucket private
      // ServerSideEncryption: "AES256",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    // Return fileUrl for convenience (useful only if your objects are public)
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return res.json({ uploadUrl, key, fileUrl });
  } catch (error) {
    return next(new HttpError(error?.message || "Presign failed", 500));
  }
};

exports.uploadFood = async (req, res, next) => {
  const { uid } = req.params;
  const { name, imageUrl, kcal, carbon, protein, fat, type } = req.body;
  let existingUser;
  try {
    existingUser = await User.findById(uid);
    if (!existingUser) return next(new HttpError("User does not exist!", 404));
  } catch (error) {
    console.log("couldn't get user by id");
    return next(new HttpError("Couldn't get user by id", 500));
  }
  if (!name || !imageUrl || !type) {
    console.log(name, imageUrl, kcal, carbon, protein, fat, type);
    return next(new HttpError("All fields are required", 422));
  }
  const food = new Food({
    creator: uid,
    isPublic: true,
    name,
    image: imageUrl,
    kcal: !kcal ? 0 : kcal,
    carbon: !carbon ? 0 : carbon,
    protein: !protein ? 0 : protein,
    fat: !fat ? 0 : fat,
    type,
  });
  try {
    await food.save();
  } catch (error) {
    console.log("couldn't save food");
    return next(new HttpError(error, 500));
  }
  return res.status(201).json({ msg: "Food uploaded successfully", food });
};

exports.getCustomizedFood = async (req, res, next) => {
  const { uid } = req.params;
  if (!uid) {
    return next(new HttpError("Missing user ID in parameters.", 400));
  }

  try {
    const [foodsArray, exercisesArray] = await Promise.all([
      Food.find({
        isPublic: true,
        $or: [{ creator: uid }],
      }).lean(),
      Exercise.find({
        isPublic: true,
        $or: [{ creator: uid }],
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

exports.updateFood = async (req, res, next) => {
  const { uid, foodId } = req.params;
  const { name, kcal, carbon, protein, fat, type } = req.body;

  if (!uid || !foodId) {
    return next(
      new HttpError("Missing user ID or food ID in parameters.", 400)
    );
  }

  let food;
  try {
    food = await Food.findById(foodId);
    if (!food) {
      return next(new HttpError("Food not found", 404));
    }
    if (food.creator !== uid) {
      return next(new HttpError("Unauthorized to update this food", 403));
    }
  } catch (error) {
    console.log("couldn't get food by id");
    return next(new HttpError("Couldn't get food by id", 500));
  }

  food.name = name || food.name;
  food.kcal = kcal || food.kcal;
  food.carbon = carbon || food.carbon;
  food.protein = protein || food.protein;
  food.fat = fat || food.fat;
  food.type = type || food.type;

  try {
    await food.save();
  } catch (error) {
    console.log("couldn't save updated food");
    return next(new HttpError(error, 500));
  }

  return res
    .status(200)
    .json({ msg: "Food updated successfully", updated: food });
};

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

  const { id, weight, height, frequency, type } = req.body;

  const basicInfo = new Basic({
    id,
    weight,
    height,
    frequency,
    type,
  });

  try {
    await basicInfo.save();
  } catch (error) {
    return next(new HttpError("Add information failed", 500));
  }
  return res.status(200).json({ msg: "Added successfully" });
};

exports.addBasicInformation = addBasicInformation;

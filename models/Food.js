const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const foodSchema = new Schema({
  creator: { type: String, required: true },
  isPublic: { type: Boolean, require: true, default: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  kcal: { type: Number, require: true },
  carbon: { type: Number, require: true },
  protein: { type: Number, require: true },
  fat: { type: Number, require: true },
  type: { type: String, require: true },
});

module.exports = mongoose.model("Food", foodSchema, "foodPool");

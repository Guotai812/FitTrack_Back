const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const foodSchema = new Schema({
  creator: { type: String, required: true },
  name: { type: Number, unique: true, required: true },
  image: { type: Number, required: true },
  kcal: { type: Number, require: true },
  carbon: { type: Number, require: true },
  protein: { type: Number, require: true },
  fat: { type: Number, require: true },
});

foodSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Food", foodSchema, "foodPool");

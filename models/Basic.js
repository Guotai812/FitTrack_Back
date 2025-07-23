const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const basicSchema = new Schema({
  userId: { type: String, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  kcal: { type: Number, require: true },
  currentKcal: { type: Number, require: true },
  date: { type: String, require: true },
  diets: {
    type: {},
    default: {},
  },

  exercises: { type: [String], default: [] },
});

basicSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Basic", basicSchema);

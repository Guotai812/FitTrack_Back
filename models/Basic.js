const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const basicSchema = new Schema({
  userId: { type: String, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  kcal: { type: Number, require: true },
  date: { type: String, require: true },
  diets: {
    type: {},
    default: {
      breakfast: {
        extra: [{ food: "", weight: 0 }],
        diet: [{ food: "", weight: 0 }],
      },
      lunch: {
        extra: [{ food: "", weight: 0 }],
        diet: [{ food: "", weight: 0 }],
      },
      dinner: {
        extra: [{ food: "", weight: 0 }],
        diet: [{ food: "", weight: 0 }],
      },
    },
  },
  exercises: { type: [String], default: [] },
});

basicSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Basic", basicSchema);

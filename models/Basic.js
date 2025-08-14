const mongoose = require("mongoose");


const Schema = mongoose.Schema;
// TODO: add a fiedl named isWeightUpdated?
const basicSchema = new Schema({
  userId: { type: String, required: true },
  weight: { type: Number, required: true },
  isChanged: { type: Boolean, required: true, default: false },
  height: { type: Number, required: true },
  kcal: { type: Number, require: true },
  currentKcal: { type: Number, require: true },
  date: { type: String, require: true },
  diets: {
    type: {},
    default: {},
  },
  exercises: { type: {}, default: {} },
});


module.exports = mongoose.model("Basic", basicSchema);

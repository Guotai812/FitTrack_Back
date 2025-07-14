const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const basicSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  frequency: { type: String, required: true },
  type: { type: String, required: true },
  age: { type: Number, required: true },
  calories: { type: Number, require: true },
});

basicSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Basic", basicSchema);

const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  isCompleted: { type: Boolean, required: true },
  kcal: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  age: { type: Number, default: 0 },
  birthdate: { type: String, default: "" },
  frequency: { type: String, default: "" },
  type: { type: String, default: "" },
  goal: { type: String, default: "" },
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  gender: { type: String },
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
  exercises: { type: {}, default: { aerobic: {}, anaerobic: {} } },
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);

// exercises: {aerobic: {eid: [[date, duration]]}, anaerobic: {eid: [{date, exercise: [{weight, reps, sets}, {} ]}]}}

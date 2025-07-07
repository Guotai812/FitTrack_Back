const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const basicSchema = new Schema({
  id: { type: String, required: true, unique: true },
  weight: { type: String, required: true, unique: true },
  height: { type: String, required: true },
  frequency: { type: String, required: true },
  type: { type: String, required: true },
});

basicSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Basic", basicSchema);

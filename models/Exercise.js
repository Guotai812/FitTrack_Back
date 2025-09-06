const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  creator: { type: String, required: true },
  isPublic: { type: Boolean, require: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  type: { type: String, enum: ["aerobic", "anaerobic"], required: true },
  subType: { type: String },

  // cardio fields
  met: { type: Number, default: null },
  kcalPerHour: { type: Number, default: null },

  // strength fields
  defaultRom: { type: Number, default: null }, // metres per rep
  efficiency: { type: Number, default: 0.2 }, // 20% muscle efficiency
  buffer: { type: Number, default: 1.15 }, // +15% stabilizers/EPOC

  // **the pre-computed “magic” multiplier**:
  kcalPerKgMeter: {
    type: Number,
    default: function () {
      // g × (1/4184) ÷ efficiency × buffer
      return (9.81 / 4184 / this.efficiency) * this.buffer;
    },
  },
});

module.exports = mongoose.model("Exercise", exerciseSchema, "exercisePool");

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  googleid: String,
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  // Derived stats (stored for convenience)
  winRate: { type: Number, default: 0 },        // wins / (wins + losses)
  bayesianScore: { type: Number, default: 0 },  // (wins + alpha) / (wins + losses + alpha + beta)
  // One-time achievements (store achievement IDs the user has unlocked)
  achievements: { type: [String], default: [] },
  // Ordered history of outcomes, most recent last.
  // Each entry may be a simple string ('W' or 'L') from older data,
  // or an object: { result: 'W'|'L', date, playerHandName, dealerHandName }.
  winLossHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

// compile model from schema
module.exports = mongoose.model("user", UserSchema);

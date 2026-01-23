const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  googleid: String,
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  // Add any other user-specific fields here
  // Examples:
  // settings: { type: Object, default: {} },
  // achievements: [String],
  // lastPlayed: Date,
  // totalGames: { type: Number, default: 0 },
});

// compile model from schema
module.exports = mongoose.model("user", UserSchema);

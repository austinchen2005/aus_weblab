/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");

// import models so we can interact with the database
const User = require("./models/user");

// import authentication library
const auth = require("./auth");

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

// Helper to recompute derived stats based on wins/losses
function computeDerivedStats(user) {
  const wins = user.wins || 0;
  const losses = user.losses || 0;
  const totalGames = wins + losses;
  const alpha = 0;
  const beta = 10;

  const winRate = totalGames > 0 ? wins / totalGames : 0;
  const bayesianScore =
    wins + losses + alpha + beta > 0
      ? (wins + alpha) / (wins + losses + alpha + beta)
      : 0;

  return { winRate, bayesianScore };
}

// Helper to compute which achievements should be unlocked based on stats
// Returns an array of achievement IDs.
function computeAchievementsFromStats({ wins = 0, losses = 0, bayesianScore = 0 }) {
  const totalGames = wins + losses;
  const result = [];

  // Starting out: Play one game.
  if (totalGames >= 1) {
    result.push("starting_out");
  }

  // Rookie: Get bayes score > 0.1
  if (bayesianScore > 0.1) {
    result.push("rookie");
  }

  // Novice: Get bayes score > 0.2
  if (bayesianScore > 0.2) {
    result.push("novice");
  }

  // Proficient: Get bayes score > 0.3
  if (bayesianScore > 0.3) {
    result.push("proficient");
  }

  // Skilled: Get bayes score > 0.4
  if (bayesianScore > 0.4) {
    result.push("skilled");
  }

  // Master: Get bayes score > 0.5
  if (bayesianScore > 0.5) {
    result.push("master");
  }

  return result;
}

//initialize socket
const socketManager = require("./server-socket");

router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.get("/whoami", (req, res) => {
  if (!req.user) {
    // not logged in
    return res.send({});
  }

  res.send(req.user);
});

router.post("/initsocket", (req, res) => {
  // do nothing if user not logged in
  if (req.user)
    socketManager.addUser(req.user, socketManager.getSocketFromSocketID(req.body.socketid));
  res.send({});
});

// |------------------------------|
// | write your API methods below!|
// |------------------------------|

// Update user's wins and losses
router.post("/updateStats", auth.ensureLoggedIn, (req, res) => {
  const { wins, losses } = req.body;
  
  // Compute new wins/losses
  const newWins = wins !== undefined ? wins : req.user.wins;
  const newLosses = losses !== undefined ? losses : req.user.losses;
  const derived = computeDerivedStats({ wins: newWins, losses: newLosses });
  const achievements = computeAchievementsFromStats({
    wins: newWins,
    losses: newLosses,
    bayesianScore: derived.bayesianScore,
  });

  // Update user in database with derived stats
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        wins: newWins,
        losses: newLosses,
        winRate: derived.winRate,
        bayesianScore: derived.bayesianScore,
        achievements,
      },
    },
    { new: true } // Return updated document
  )
    .then((updatedUser) => {
      // Update session with new user data
      req.session.user = updatedUser;
      res.send(updatedUser);
    })
    .catch((err) => {
      console.log(`Error updating stats: ${err}`);
      res.status(500).send({ err: "Failed to update stats" });
    });
});

// Increment wins (add 1 to current wins)
router.post("/incrementWin", auth.ensureLoggedIn, (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    { $inc: { wins: 1 } }, // Increment wins by 1
    { new: true }
  )
    .then((updatedUser) => {
      const { winRate, bayesianScore } = computeDerivedStats(updatedUser);
      updatedUser.winRate = winRate;
      updatedUser.bayesianScore = bayesianScore;
      updatedUser.achievements = computeAchievementsFromStats({
        wins: updatedUser.wins || 0,
        losses: updatedUser.losses || 0,
        bayesianScore,
      });
      return updatedUser.save();
    })
    .then((savedUser) => {
      req.session.user = savedUser;
      res.send(savedUser);
    })
    .catch((err) => {
      console.log(`Error incrementing win: ${err}`);
      res.status(500).send({ err: "Failed to increment win" });
    });
});

// Increment losses (add 1 to current losses)
router.post("/incrementLoss", auth.ensureLoggedIn, (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    { $inc: { losses: 1 } }, // Increment losses by 1
    { new: true }
  )
    .then((updatedUser) => {
      const { winRate, bayesianScore } = computeDerivedStats(updatedUser);
      updatedUser.winRate = winRate;
      updatedUser.bayesianScore = bayesianScore;
      updatedUser.achievements = computeAchievementsFromStats({
        wins: updatedUser.wins || 0,
        losses: updatedUser.losses || 0,
        bayesianScore,
      });
      return updatedUser.save();
    })
    .then((savedUser) => {
      req.session.user = savedUser;
      res.send(savedUser);
    })
    .catch((err) => {
      console.log(`Error incrementing loss: ${err}`);
      res.status(500).send({ err: "Failed to increment loss" });
    });
});

// Update any user field (generic update endpoint)
router.post("/updateUser", auth.ensureLoggedIn, (req, res) => {
  const updates = req.body;
  
  // Remove fields that shouldn't be updated directly
  delete updates._id;
  delete updates.googleid;
  
  User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true })
    .then((updatedUser) => {
      // If wins or losses were changed via updateUser, recompute derived stats
      if (
        Object.prototype.hasOwnProperty.call(updates, "wins") ||
        Object.prototype.hasOwnProperty.call(updates, "losses")
      ) {
        const { winRate, bayesianScore } = computeDerivedStats(updatedUser);
        updatedUser.winRate = winRate;
        updatedUser.bayesianScore = bayesianScore;
        updatedUser.achievements = computeAchievementsFromStats({
          wins: updatedUser.wins || 0,
          losses: updatedUser.losses || 0,
          bayesianScore,
        });
        return updatedUser.save();
      }
      return updatedUser;
    })
    .then((savedUser) => {
      req.session.user = savedUser;
      res.send(savedUser);
    })
    .catch((err) => {
      console.log(`Error updating user: ${err}`);
      res.status(500).send({ err: "Failed to update user" });
    });
});

// Public leaderboard: return all users with stats, sorted by bayesianScore then wins
router.get("/leaderboard", (req, res) => {
  User.find({})
    .then((users) => {
      const enriched = users.map((user) => {
        const obj = user.toObject();
        // Ensure derived stats exist (for old documents)
        const derived = computeDerivedStats(obj);
        return {
          _id: obj._id,
          name: obj.name || "Anonymous",
          wins: obj.wins || 0,
          losses: obj.losses || 0,
          winRate: obj.winRate != null ? obj.winRate : derived.winRate,
          bayesianScore:
            obj.bayesianScore != null ? obj.bayesianScore : derived.bayesianScore,
        };
      });

      enriched.sort((a, b) => {
        if (b.bayesianScore !== a.bayesianScore) {
          return b.bayesianScore - a.bayesianScore;
        }
        // Tie-breaker: more wins first
        return b.wins - a.wins;
      });

      res.send(enriched);
    })
    .catch((err) => {
      console.log(`Error loading leaderboard: ${err}`);
      res.status(500).send({ err: "Failed to load leaderboard" });
    });
});

// Check if a username is available (not used by another user)
router.post("/checkUsername", (req, res) => {
  const { name } = req.body || {};
  const trimmed = (name || "").trim();

  if (!trimmed) {
    return res.status(400).send({ err: "Username is required" });
  }

  User.findOne({ name: trimmed })
    .then((existing) => {
      if (!existing) {
        // No user has this name; it's available
        return res.send({ available: true });
      }

      // If the existing user is the same as the requester, treat as available
      if (req.user && existing._id.toString() === req.user._id.toString()) {
        return res.send({ available: true, isCurrentUser: true });
      }

      // Taken by a different user
      return res.send({ available: false });
    })
    .catch((err) => {
      console.log(`Error checking username: ${err}`);
      res.status(500).send({ err: "Failed to check username" });
    });
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;  
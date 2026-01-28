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

// All known achievement IDs (must stay in sync with client/constants/achievements.js)
const ALL_ACHIEVEMENT_IDS = [
  "starting_out",
  "rookie",
  "novice",
  "proficient",
  "skilled",
  "master",
  "legend",
  "royalty",
  "ruler_flush",
  "leg_day",
  "filled_home",
  "flush_toilet",
  "straightforward",
  "ouch",
  "twos_better_than_one",
  "got_a_pair",
  "no_hand_needed",
  "hidden_spade",
  "heart_of_the_cards",
  "got_a_feel",
  "dedicated",
  "win_streak",
  "all_skill",
  "against_all_odds",
  "stacked_deck",
  "give_me_everything",
  "i_am_all",
];

const META_ACHIEVEMENT_ID = "i_am_all";

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
// Returns an array of *stat-based* achievement IDs.
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

  // Got a feel: Play 10 games
  if (totalGames >= 10) {
    result.push("got_a_feel");
  }

  // Dedicated: Play 100 games
  if (totalGames >= 100) {
    result.push("dedicated");
  }

  return result;
}

// Compute win-streak based achievements from win/loss history.
// History entries may be strings ('W'/'L') or objects with { result }.
function computeStreakAchievements(history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    const res = typeof entry === "string" ? entry : entry && entry.result;
    if (res === "W") {
      streak += 1;
    } else {
      break;
    }
  }
  const ids = [];
  if (streak >= 3) ids.push("win_streak");
  if (streak >= 7) ids.push("all_skill");
  return ids;
}

// Merge existing achievements with new ones, and award meta "i_am_all" if all others are present.
function mergeAchievements(existing, toAdd) {
  const set = new Set(existing || []);

  (toAdd || []).forEach((id) => {
    if (ALL_ACHIEVEMENT_IDS.includes(id)) {
      set.add(id);
    }
  });

  // If user has all achievements except the meta one, grant "i_am_all"
  const allButMeta = ALL_ACHIEVEMENT_IDS.filter((id) => id !== META_ACHIEVEMENT_ID);
  const hasAllButMeta = allButMeta.every((id) => set.has(id));
  if (hasAllButMeta) {
    set.add(META_ACHIEVEMENT_ID);
  }

  return Array.from(set);
}

// Compute whether the given user should receive the \"legend\" achievement
// (being #1 on the leaderboard by bayesianScore, then wins).
function computeLegendAchievement(userId) {
  return User.find({})
    .then((users) => {
      if (!users || users.length === 0) return [];

      const enriched = users.map((user) => {
        const obj = user.toObject();
        const derived = computeDerivedStats(obj);
        return {
          _id: obj._id,
          wins: obj.wins || 0,
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

      const top = enriched[0];
      if (top && String(top._id) === String(userId)) {
        return ["legend"];
      }
      return [];
    })
    .catch((err) => {
      console.log(`Error computing legend achievement: ${err}`);
      return [];
    });
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

// Achievement statistics: percentage of users who have each achievement
router.get("/achievementStats", (req, res) => {
  User.find({}, "achievements")
    .then((users) => {
      const totalUsers = users.length;
      const counts = {};
      const percentages = {};

      ALL_ACHIEVEMENT_IDS.forEach((id) => {
        counts[id] = 0;
      });

      users.forEach((user) => {
        (user.achievements || []).forEach((id) => {
          if (counts[id] !== undefined) {
            counts[id] += 1;
          }
        });
      });

      ALL_ACHIEVEMENT_IDS.forEach((id) => {
        if (totalUsers === 0) {
          percentages[id] = 0;
        } else {
          const pct = (counts[id] * 100) / totalUsers;
          percentages[id] = Math.round(pct * 10) / 10; // one decimal place
        }
      });

      res.send({ totalUsers, counts, percentages });
    })
    .catch((err) => {
      console.log(`Error computing achievement stats: ${err}`);
      res.status(500).send({ err: "Failed to compute achievement stats" });
    });
});

// Update user's wins and losses
router.post("/updateStats", auth.ensureLoggedIn, (req, res) => {
  const { wins, losses } = req.body;
  
  // Compute new wins/losses
  const previousWins = req.user.wins || 0;
  const previousLosses = req.user.losses || 0;
  const newWins = wins !== undefined ? wins : previousWins;
  const newLosses = losses !== undefined ? losses : previousLosses;
  const deltaWins = newWins - previousWins;
  const deltaLosses = newLosses - previousLosses;
  const derived = computeDerivedStats({ wins: newWins, losses: newLosses });
  const statAchievements = computeAchievementsFromStats({
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
      },
    },
    { new: true } // Return updated document
  )
    .then((updatedUser) => {
      updatedUser.achievements = mergeAchievements(
        updatedUser.achievements,
        statAchievements
      );
      if (!Array.isArray(updatedUser.winLossHistory)) {
        updatedUser.winLossHistory = [];
      }
      const hist = updatedUser.winLossHistory;
      // Special case: converting a pending loss into a win
      // (deltaWins = +1, deltaLosses = -1). Flip the most recent 'L' to 'W'
      // if present; otherwise just append a 'W'.
      if (deltaWins === 1 && deltaLosses === -1) {
        if (hist.length > 0) {
          const last = hist[hist.length - 1];
          if (typeof last === "string" && last === "L") {
            hist[hist.length - 1] = "W";
          } else if (last && typeof last === "object" && last.result === "L") {
            last.result = "W";
            last.date = new Date();
            last.playerHandName = req.body.playerHandName || last.playerHandName || null;
            last.dealerHandName = req.body.dealerHandName || last.dealerHandName || null;
          } else {
            hist.push({
              result: "W",
              date: new Date(),
              playerHandName: req.body.playerHandName || null,
              dealerHandName: req.body.dealerHandName || null,
            });
          }
        } else {
          hist.push({
            result: "W",
            date: new Date(),
            playerHandName: req.body.playerHandName || null,
            dealerHandName: req.body.dealerHandName || null,
          });
        }
      } else if (hist.length === 0) {
        // Initialization fallback for existing users with no history:
        // put all wins first, then all losses (approximate order), without hand names.
        const history = [];
        for (let i = 0; i < newWins; i += 1) history.push({ result: "W" });
        for (let i = 0; i < newLosses; i += 1) history.push({ result: "L" });
        updatedUser.winLossHistory = history;
      }
      return updatedUser
        .save()
        .then((savedUser) =>
          computeLegendAchievement(savedUser._id).then((legendIds) => {
            if (!legendIds.length) return savedUser;
            savedUser.achievements = mergeAchievements(
              savedUser.achievements,
              legendIds
            );
            return savedUser.save();
          })
        );
    })
    .then((finalUser) => {
      // Update session with new user data
      req.session.user = finalUser;
      res.send(finalUser);
    })
    .catch((err) => {
      console.log(`Error updating stats: ${err}`);
      res.status(500).send({ err: "Failed to update stats" });
    });
});

// Reset profile: clear wins, losses, derived stats, and all achievements
router.post("/resetProfile", auth.ensureLoggedIn, (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        wins: 0,
        losses: 0,
        winRate: 0,
        bayesianScore: 0,
        achievements: [],
        winLossHistory: [],
      },
    },
    { new: true }
  )
    .then((updatedUser) => {
      req.session.user = updatedUser;
      res.send(updatedUser);
    })
    .catch((err) => {
      console.log(`Error resetting profile: ${err}`);
      res.status(500).send({ err: "Failed to reset profile" });
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
      if (!Array.isArray(updatedUser.winLossHistory)) {
        updatedUser.winLossHistory = [];
      }
      if (updatedUser.winLossHistory.length === 0) {
        // Initialize history from current totals (all wins then losses) without hand names
        const history = [];
        const w = updatedUser.wins || 0;
        const l = updatedUser.losses || 0;
        for (let i = 0; i < w; i += 1) history.push({ result: "W" });
        for (let i = 0; i < l; i += 1) history.push({ result: "L" });
        updatedUser.winLossHistory = history;
      } else {
        updatedUser.winLossHistory.push({
          result: "W",
          date: new Date(),
          playerHandName: req.body.playerHandName || null,
          dealerHandName: req.body.dealerHandName || null,
        });
      }
      const statIds = computeAchievementsFromStats({
        wins: updatedUser.wins || 0,
        losses: updatedUser.losses || 0,
        bayesianScore,
      });
      const streakIds = computeStreakAchievements(updatedUser.winLossHistory);
      updatedUser.achievements = mergeAchievements(
        updatedUser.achievements,
        [...statIds, ...streakIds]
      );
      return updatedUser
        .save()
        .then((savedUser) =>
          computeLegendAchievement(savedUser._id).then((legendIds) => {
            if (!legendIds.length) return savedUser;
            savedUser.achievements = mergeAchievements(
              savedUser.achievements,
              legendIds
            );
            return savedUser.save();
          })
        );
    })
    .then((finalUser) => {
      req.session.user = finalUser;
      res.send(finalUser);
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
      updatedUser.achievements = mergeAchievements(
        updatedUser.achievements,
        computeAchievementsFromStats({
          wins: updatedUser.wins || 0,
          losses: updatedUser.losses || 0,
          bayesianScore,
        })
      );
      if (!Array.isArray(updatedUser.winLossHistory)) {
        updatedUser.winLossHistory = [];
      }
      if (updatedUser.winLossHistory.length === 0) {
        // Initialize history from current totals (all wins then losses) without hand names
        const history = [];
        const w = updatedUser.wins || 0;
        const l = updatedUser.losses || 0;
        for (let i = 0; i < w; i += 1) history.push({ result: "W" });
        for (let i = 0; i < l; i += 1) history.push({ result: "L" });
        updatedUser.winLossHistory = history;
      } else {
        updatedUser.winLossHistory.push({
          result: "L",
          date: new Date(),
          playerHandName: req.body.playerHandName || null,
          dealerHandName: req.body.dealerHandName || null,
        });
      }
      return updatedUser
        .save()
        .then((savedUser) =>
          computeLegendAchievement(savedUser._id).then((legendIds) => {
            if (!legendIds.length) return savedUser;
            savedUser.achievements = mergeAchievements(
              savedUser.achievements,
              legendIds
            );
            return savedUser.save();
          })
        );
    })
    .then((finalUser) => {
      req.session.user = finalUser;
      res.send(finalUser);
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
        updatedUser.achievements = mergeAchievements(
          updatedUser.achievements,
          computeAchievementsFromStats({
            wins: updatedUser.wins || 0,
            losses: updatedUser.losses || 0,
            bayesianScore,
          })
        );
        // If caller explicitly set wins/losses through updateUser, rebuild history
        // as all wins then all losses (we don't know true recency order here).
        if (
          !Array.isArray(updatedUser.winLossHistory) ||
          updatedUser.winLossHistory.length === 0
        ) {
          const history = [];
          const w = updatedUser.wins || 0;
          const l = updatedUser.losses || 0;
          for (let i = 0; i < w; i += 1) history.push({ result: "W" });
          for (let i = 0; i < l; i += 1) history.push({ result: "L" });
          updatedUser.winLossHistory = history;
        }
        return updatedUser
          .save()
          .then((savedUser) =>
            computeLegendAchievement(savedUser._id).then((legendIds) => {
              if (!legendIds.length) return savedUser;
              savedUser.achievements = mergeAchievements(
                savedUser.achievements,
                legendIds
              );
              return savedUser.save();
            })
          );
      }
      return updatedUser;
    })
    .then((finalUser) => {
      req.session.user = finalUser;
      res.send(finalUser);
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

// Unlock specific achievements (e.g., hand-type achievements)
router.post("/unlockAchievements", auth.ensureLoggedIn, (req, res) => {
  const { ids } = req.body || {};
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send({ err: "Achievement IDs array is required" });
  }

  // Get current user
  User.findById(req.user._id)
    .then((user) => {
      if (!user) {
        return res.status(404).send({ err: "User not found" });
      }

      // Merge new achievements with existing ones
      user.achievements = mergeAchievements(user.achievements, ids);
      
      return user.save();
    })
    .then((savedUser) => {
      // Update session with new user data
      req.session.user = savedUser;
      res.send(savedUser);
    })
    .catch((err) => {
      console.log(`Error unlocking achievements: ${err}`);
      res.status(500).send({ err: "Failed to unlock achievements" });
    });
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;  
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

// Get user stats (wins and losses)
router.get("/stats", auth.ensureLoggedIn, (req, res) => {
  res.send({
    wins: req.user.wins || 0,
    losses: req.user.losses || 0,
  });
});

// Update user stats
router.post("/stats", auth.ensureLoggedIn, async (req, res) => {
  try {
    const { wins, losses } = req.body;
    const user = await User.findById(req.user._id);
    
    if (wins !== undefined) {
      user.wins = wins;
    }
    if (losses !== undefined) {
      user.losses = losses;
    }
    
    await user.save();
    res.send({ wins: user.wins, losses: user.losses });
  } catch (err) {
    console.log(`Failed to update stats: ${err}`);
    res.status(500).send({ err });
  }
});

// Increment wins
router.post("/increment-wins", auth.ensureLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wins = (user.wins || 0) + 1;
    await user.save();
    res.send({ wins: user.wins, losses: user.losses || 0 });
  } catch (err) {
    console.log(`Failed to increment wins: ${err}`);
    res.status(500).send({ err });
  }
});

// Increment losses
router.post("/increment-losses", auth.ensureLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.losses = (user.losses || 0) + 1;
    await user.save();
    res.send({ wins: user.wins || 0, losses: user.losses });
  } catch (err) {
    console.log(`Failed to increment losses: ${err}`);
    res.status(500).send({ err });
  }
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;

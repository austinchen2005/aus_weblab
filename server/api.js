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

// Update user's wins and losses
router.post("/updateStats", auth.ensureLoggedIn, (req, res) => {
  const { wins, losses } = req.body;
  
  // Update user in database
  User.findByIdAndUpdate(
    req.user._id,
    { 
      $set: { 
        wins: wins !== undefined ? wins : req.user.wins,
        losses: losses !== undefined ? losses : req.user.losses,
      }
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
      req.session.user = updatedUser;
      res.send(updatedUser);
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
      req.session.user = updatedUser;
      res.send(updatedUser);
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
  
  User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true }
  )
    .then((updatedUser) => {
      req.session.user = updatedUser;
      res.send(updatedUser);
    })
    .catch((err) => {
      console.log(`Error updating user: ${err}`);
      res.status(500).send({ err: "Failed to update user" });
    });
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;  
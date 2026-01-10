const { OAuth2Client } = require("google-auth-library");
const User = require("./models/user");
const socketManager = require("./server-socket");

// create a new OAuth client used to verify google sign-in
//    TODO: replace with your own CLIENT_ID
const CLIENT_ID = "1001640154904-l5u78j6sq3jp3mgohhf6uaa9qolk3rgu.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

// accepts a login token from the frontend, and verifies that it's legit
function verify(token) {
  return client
    .verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    })
    .then((ticket) => ticket.getPayload());
}

// gets user from DB, or makes a new account if it doesn't exist yet
function getOrCreateUser(user) {
  // the "sub" field means "subject", which is a unique identifier for each user
  return User.findOne({ googleid: user.sub }).then((existingUser) => {
    if (existingUser) return existingUser;

    const newUser = new User({
      name: user.name,
      googleid: user.sub,
    });

    return newUser.save();
  });
}

function login(req, res) {
  console.log('Login attempt received');
  if (!req.body.token) {
    console.log('No token provided');
    return res.status(400).send({ err: 'No token provided' });
  }
  
  verify(req.body.token)
    .then((user) => {
      console.log('Token verified, user:', user.name);
      return getOrCreateUser(user);
    })
    .then((user) => {
      console.log('User found/created:', user.name);
      // persist user in the session
      req.session.user = user;
      res.send(user);
    })
    .catch((err) => {
      console.error(`Failed to log in:`, err);
      res.status(401).send({ err: err.message || err.toString() });
    });
}

function logout(req, res) {
  req.session.user = null;
  res.send({});
}

function populateCurrentUser(req, res, next) {
  // simply populate "req.user" for convenience
  req.user = req.session.user;
  next();
}

function ensureLoggedIn(req, res, next) {
  if (!req.user) {
    return res.status(401).send({ err: "not logged in" });
  }

  next();
}

module.exports = {
  login,
  logout,
  populateCurrentUser,
  ensureLoggedIn,
};

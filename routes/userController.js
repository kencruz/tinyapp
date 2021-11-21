const bcrypt = require('bcryptjs');
const { users } = require('../data');
const {
  generateRandomString,
  getUserByEmail,
} = require('../helpers');

// shows the user registration page
const getRegistrationForm = (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.userId];

  // go to user url page if user is already logged in
  if (user) {
    return res.redirect('/urls');
  }

  // go to registration page
  const templateVars = { user };
  return res.render('registration', templateVars);
};

// registers a new user
const createUser = (req, res) => {
  // get the email and password from the request body
  const { email, password } = req.body;

  // go to error page if email or password values are empty
  if (!email || !password) {
    return res
      .status(400)
      .render('error', { user: null, error: 'Email and/or password is empty' });
  }

  // go to error page if email or password values are empty
  if (getUserByEmail(email, users)) {
    return res
      .status(403)
      .render('error', { user: null, error: 'Email already exists.' });
  }

  // user id is random and password is hashed before saving to database
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, 10),
  };

  // user id is sent as an encrypted cookie and redirect to user's url page
  req.session.userId = id;
  return res.redirect('/urls');
};

const authenticateUser = (req, res) => {
  // get the email and password from the request body
  const { email, password } = req.body;

  // go to error page if email or password values are empty
  if (!email || !password) {
    return res
      .status(400)
      .render('error', { user: null, error: 'Email and/or password is empty' });
  }

  // go to error page if email not found in database
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).render('error', { user, error: 'Email not found.' });
  }

  // hashes password hash and compares with the one in the database
  if (!bcrypt.compareSync(password, user.password)) {
    // go to error page if password is invalid
    return res
      .status(403)
      .render('error', { user: null, error: 'Invalid password.' });
  }

  // if successfully authenticated, send user id as encrypted cookie and redirect to /url
  req.session.userId = user.id;
  return res.redirect('/urls');
};

const getLoginPage = (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.userId];

  // logged in users will redirect to /url
  if (user) {
    return res.redirect('/urls');
  }

  // unlogged in users will see the login page
  const templateVars = { user };
  return res.render('login', templateVars);
};

const logoutUser = (req, res) => {
  // remove cookies in browser and redirect user to /url
  req.session = null;
  return res.redirect('/urls');
};

module.exports = {
  getRegistrationForm,
  createUser,
  authenticateUser,
  getLoginPage,
  logoutUser,
};

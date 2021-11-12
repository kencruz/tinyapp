const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcryptjs');
const {getUserByEmail} = require('./helpers');

// returns a random 6-digit alphanumeric string
const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

// returns urls owned by given user id
const urlsForUser = (id) => {
  const urls = {};
  for (const shortURL in urlDatabase) {
    // only insert shortURLs if id matches
    if (urlDatabase[shortURL].userID === id) {
      urls[shortURL] = urlDatabase[shortURL];
    }
  }
  return urls;
};

const urlDatabase = {
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "user2RandomID" },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10),
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10),
  },
};

// set up middleware to read request body easily
app.use(bodyParser.urlencoded({ extended: true }));

// set up middleware to use encrypted cookies
app.use(cookieSession({
  name: 'session',
  keys: ['break this plz', 'actually don\'t, be nice'],
}));

// use ejs templates for the html pages
app.set("view engine", "ejs");

// at the root path redirect to /urls if logged in, else go to login page
app.get("/", (req, res) => {
  if (users[req.session.user_id]) {
    return res.redirect("/urls");
  }
  return res.redirect("/login");
});

// shows the user registration page
app.get("/register", (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.user_id];

  // go to user url page if user is already logged in
  if (user) {
    return res.redirect("/urls");
  }

  // go to registration page
  const templateVars = { user };
  return res.render("registration", templateVars);
});

// registers a new user
app.post("/register", (req, res) => {
  // get the email and password from the request body
  const { email, password } = req.body;

  // go to error page if email or password values are empty
  if (!email || !password) {
    return res.status(400).render('error', {user: null, error: "Email and/or password is empty"});
  }

  // go to error page if email or password values are empty
  if (getUserByEmail(email, users)) {
    return res.status(403).render('error', {user: null, error: "Email already exists."});
  }

  // user id is random and password is hashed before saving to database
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, 10),
  };

  // user id is sent as an encrypted cookie and redirect to user's url page
  req.session.user_id = id;
  return res.redirect("/urls");
});

// endpoint for processing login credentials
app.post("/login", (req, res) => {
  // get the email and password from the request body
  const { email, password } = req.body;

  // go to error page if email or password values are empty
  if (!email || !password) {
    return res.status(400).render('error', {user: null, error: "Email and/or password is empty"});
  }

  // go to error page if email not found in database
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).render('error', {user, error: "Email not found."});
  }

  // hashes password hash and compares with the one in the database
  if (!bcrypt.compareSync(password, user.password)) {
    // go to error page if password is invalid
    return res.status(403).render('error', {user, error: "Invalid password."});
  }

  // if successfully authenticated, send user id as encrypted cookie and redirect to /url
  req.session.user_id = user.id;
  return res.redirect("/urls");
});

// show the login page
app.get("/login", (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.user_id];

  // logged in users will redirect to /url
  if (user) {
    return res.redirect("/urls");
  }

  // unlogged in users will see the login page
  const templateVars = {user};
  return res.render("login", templateVars);
});

// endpoint to log out user
app.post("/logout", (req, res) => {
// remove cookies in browser and redirect user to /url
  req.session = null;
  return res.redirect("/urls");
});

// the endpoint to view the form to create a new shortURL
app.get("/urls/new", (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.user_id];

  // unauthenticated users are redirected to /login
  if (!user) {
    return res.redirect("/login");
  }

  // authenticated users are shown the page to make new shortURLs
  const templateVars = {user};
  return res.render("urls_new", templateVars);
});

// the endpoint to create a new shortURL
app.post("/urls", (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.user_id];

  // unauthenticated users are shown the error page
  if (!user) {
    return res.status(403).render('error', {user, error: "Unauthorized user can't add a url link."});
  }

  // authenticated users will generate a new shortURL for their longURL and saved to database
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: user.id,
  };

  // redirect to the new shortURL page
  return res.redirect(`/urls/${shortURL}`);
});

// show a list of urls owned by user
app.get("/urls", (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.user_id];

  // unauthenticated users are shown the error page
  if (!user) {
    return res.status(403).render('error', {user, error: "Log in to view url page."});
  }

  // build the urls owned by the user
  const templateVars = {
    urls: urlsForUser(user.id),
    user: user,
  };

  // render the url list with the user data
  return res.render("urls_index", templateVars);
});

// the endpoint to delete a shortURL
app.post("/urls/:shortURL/delete", (req, res) => {
  // get shortURL from request body and try to get a valid user id from cookie
  const [shortURL, user] = [req.params.shortURL, users[req.session.user_id]];
  
  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res.status(404).render('error', {user, error: "shortURL not found"});
  }

  // unauthenticated users are shown the error page
  if (!user) {
    return res.status(403).render("error", {user, error: "Can't delete this link. User not logged in."});
  }

  // users that don't own the specified url are shown the error page
  if (urlDatabase[shortURL].userID !== user.id) {
    return res.status(403).render("error", {user, error: "Unauthorized user can't delete this link."});
  }

  // if authenticated user owns the shortURL, then delete it
  if (urlDatabase[shortURL]) {
    delete urlDatabase[shortURL];
  }

  // go back to the url page
  return res.redirect("/urls");
});

// view the shortURL edit page
app.get("/urls/:shortURL", (req, res) => {
  // get shortURL from request body and try to get a valid user id from cookie
  const [shortURL, user] = [req.params.shortURL, users[req.session.user_id]];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res.status(404).render("error", {user, error: "shortURL not found."});
  }

  // unauthenticated users are shown the error page
  if (!user) {
    return res.status(403).render("error", {user, error: "Can't access shortURL page. User not logged in."});
  }

  // users that don't own the specified url are shown the error page
  if (urlDatabase[shortURL].userID !== user.id) {
    return res.status(403).render("error", {user, error: "Unauthorized user to access shortURL page."});
  }

  // show authenticated user the rendered page with url data
  const templateVars = {
    user,
    shortURL,
    longURL: urlDatabase[shortURL].longURL,
  };
  return res.render("urls_show", templateVars);
});

// the endpoint to update the shortURL's longURL
app.post("/urls/:shortURL", (req, res) => {
  // get shortURL, longURL from request body and try to get a valid user id from cookie
  const [shortURL, longURL, user] = [req.params.shortURL, req.body.longURL, users[req.session.user_id]];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res.status(404).render("error", {user, error: "shortURL not found."});
  }

  // unauthenticated users are shown the error page
  if (!user) {
    return res.status(403).render("error", {user, error: "Can't edit shortURL. User not logged in."});
  }

  // users that don't own the specified url are shown the error page
  if (urlDatabase[shortURL].userID !== user.id) {
    return res.status(403).render("error", {user, error: "Unauthorized user to access shortURL page."});
  }

  // update shortURL with new longURL and show the user's url page
  urlDatabase[shortURL].longURL = longURL;
  return res.redirect(`/urls/`);
});

// the endpoint to redirect shortURLs to their longURLs
app.get("/u/:shortURL", (req, res) => {
  // get shortURL from request body and try to get a valid user id from cookie
  const [shortURL, user] = [req.params.shortURL, users[req.session.user_id]];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res.status(404).render("error", {user, error: "Short link not found"});
  }

  // once successfully validated, redirect to longURL
  const longURL = urlDatabase[shortURL].longURL;
  return res.redirect(longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

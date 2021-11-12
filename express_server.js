const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcryptjs');
const {getUserByEmail} = require('./helpers');

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

const urlsForUser = (id) => {
  const urls = {};
  for (const shortURL in urlDatabase) {
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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['break this plz', 'actually don\'t, be nice'],
}));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  if (users[req.session.user_id]) {
    return res.redirect("/urls");
  }
  return res.redirect("/login");
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  return res.render("registration", templateVars);
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Email and/or password is empty");
    
  }
  if (getUserByEmail(email, users)) {
    return res.status(400).send("Email already exists.");
    
  }
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, 10),
  };
  console.log(users);
  req.session.user_id = id;
  return res.redirect("/urls");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Email and/or password is empty");
    
  }
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).send("Email not found.");
    
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send("Invalid password.");
    
  }
  req.session.user_id = user.id;
  return res.redirect("/urls");
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  return res.render("login", templateVars);
});

app.post("/logout", (req, res) => {
  console.log("logging out");
  req.session = null;
  return res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  if (!req.session.user_id) {
    return res.redirect("/login");
    
  }
  return res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  if (!users[req.session.user_id]) {
    return res.status(403).send("Error: Unauthorized user can't add a url link.");
    
  }
  console.log("new url post", req.post);
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.session.user_id,
  };
  return res.redirect(`/urls/${shortURL}`);
});

app.get("/urls", (req, res) => {
  const user = users[req.session.user_id];
  if (!user) {
    return res.status(403).render('error', {user, error: "Unauthorized user can't access url page."});
  }
  const templateVars = {
    urls: urlsForUser(user.id),
    user: user,
  };
  return res.render("urls_index", templateVars);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const [shortURL, user] = [req.params.shortURL, users[req.session.user_id]];
  if (!urlDatabase[shortURL]) {
    return res.status(404).render('error', {user, error: "shortURL not found"});
  }
  if (!user) {
    return res.status(403).render("error", {user, error: "Can't delete this link. User not logged in."});
  }
  if (urlDatabase[shortURL].userID !== user.id) {
    return res.status(403).render("error", {user, error: "Unauthorized user can't delete this link."});
  }
  if (urlDatabase[shortURL]) {
    delete urlDatabase[shortURL];
  }
  return res.redirect("/urls");
});

app.get("/urls/:shortURL", (req, res) => {
  const [shortURL, user] = [req.params.shortURL, users[req.session.user_id]];
  if (!urlDatabase[shortURL]) {
    return res.status(404).render("error", {user, error: "shortURL not found."});
  }
  if (!user) {
    return res.status(403).render("error", {user, error: "Can't access shortURL page. User not logged in."});
  }
  if (urlDatabase[shortURL].userID !== user.id) {
    return res.status(403).render("error", {user, error: "Unauthorized user to access shortURL page."});
  }
  const templateVars = {
    user,
    shortURL,
    longURL: urlDatabase[shortURL].longURL,
  };
  return res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL", (req, res) => {
  const [shortURL, longURL, user] = [req.params.shortURL, req.body.longURL, req.session.user_id];
  if (!urlDatabase[shortURL]) {
    return res.status(404).send("shortURL not found.");
    
  }
  if (urlDatabase[shortURL].userID !== user) {
    return res.status(403).send("Unauthorized user to access shortURL page.");
    
  }
  if (urlDatabase[shortURL]) {
    urlDatabase[shortURL].longURL = longURL;
  }
  return res.redirect(`/urls/${shortURL}`);
});

app.get("/urls.json", (req, res) => {
  return res.json(urlDatabase);
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    return res.status(404).send("Short link not found");
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  if (longURL) {
    return res.redirect(longURL);
  }
  return res.send("Not found");
});

app.get("/hello", (req, res) => {
  return res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

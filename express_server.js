const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcryptjs');

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

const getUserByEmail = (email, database) => {
  let user = null;
  for (const id in database) {
    if (database[id].email === email) {
      user = database[id];
    }
  }
  return user;
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['break this plz', 'actually don\'t, be nice'],
}));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  res.render("registration", templateVars);
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).send("Email and/or password is empty");
    return;
  }
  if (getUserByEmail(email, users)) {
    res.status(400).send("Email already exists.");
    return;
  }
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, 10),
  };
  console.log(users);
  req.session.user_id = id;
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).send("Email and/or password is empty");
    return;
  }
  const user = getUserByEmail(email, users);
  if (!user) {
    res.status(403).send("Email not found.");
    return;
  }
  if (!bcrypt.compareSync(password, user.password)) {
    res.status(403).send("Invalid password.");
    return;
  }
  req.session.user_id = user.id;
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  res.render("login", templateVars);
});

app.post("/logout", (req, res) => {
  console.log("logging out");
  req.session = null;
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.session.user_id] };
  if (!req.session.user_id) {
    res.redirect("/login");
    return;
  }
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  if (!users[req.session.user_id]) {
    res.status(403).send("Error: Unauthorized user can't add a url link.");
    return;
  }
  console.log("new url post", req.post);
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.session.user_id,
  };
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls", (req, res) => {
  const userID = req.session.user_id;
  const templateVars = {
    urls: urlsForUser(userID),
    user: users[userID],
  };
  res.render("urls_index", templateVars);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const [shortURL, userID] = [req.params.shortURL, req.session.user_id];
  if (!urlDatabase[shortURL]) {
    res.status(404).send("shortURL not found.");
    return;
  }
  if (urlDatabase[shortURL].userID !== userID) {
    res.status(403).send("Error: Unauthorized user can't delete a link.");
    return;
  }
  if (urlDatabase[shortURL]) {
    delete urlDatabase[shortURL];
  }
  const templateVars = { urls: urlDatabase };
  res.redirect("/urls");
});

app.get("/urls/:shortURL", (req, res) => {
  const [shortURL, user] = [req.params.shortURL, req.session.user_id];
  if (!urlDatabase[shortURL]) {
    res.status(404).send("shortURL not found.");
    return;
  }
  if (urlDatabase[shortURL].userID !== user) {
    res.status(403).send("Unauthorized user to access shortURL page.");
    return;
  }
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[req.session.user_id],
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL", (req, res) => {
  const [shortURL, longURL, user] = [req.params.shortURL, req.body.longURL, req.session.user_id];
  if (!urlDatabase[shortURL]) {
    res.status(404).send("shortURL not found.");
    return;
  }
  if (urlDatabase[shortURL].userID !== user) {
    res.status(403).send("Unauthorized user to access shortURL page.");
    return;
  }
  if (urlDatabase[shortURL]) {
    urlDatabase[shortURL].longURL = longURL;
  }
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404).send("Short link not found");
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.send("Not found");
  }
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

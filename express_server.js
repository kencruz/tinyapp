const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

const urlDatabase = {
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "user2RandomID" },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const doesEmailExist = (email, users) => {
  for (const id in users) {
    if (users[id].email === email) {
      return users[id];
    }
  }
  return false;
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("registration", templateVars);
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).send("Email and/or password is empty");
    return;
  }
  if (doesEmailExist(email, users)) {
    res.status(400).send("Email already exists.");
    return;
  }
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password,
  };
  console.log(users);
  res.cookie("user_id", id);
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).send("Email and/or password is empty");
    return;
  }
  const user = doesEmailExist(email, users);
  if (!user) {
    res.status(403).send("Email not found.");
    return;
  }
  if (user.password !== password) {
    res.status(403).send("Invalid password.");
    return;
  }
  res.cookie("user_id", user.id);
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("login", templateVars);
});

app.post("/logout", (req, res) => {
  console.log("logging out");
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  if (!req.cookies["user_id"]) {
    res.redirect("/login");
    return;
  }
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  if (!users[req.cookies["user_id"]]) {
    res.status(403).send("Error: Unauthorized user can't add a url link.");
    return;
  }
  console.log("new url post", req.post);
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.cookies["user_id"],
  };
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    user: users[req.cookies["user_id"]],
  };
  res.render("urls_index", templateVars);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;

  if (urlDatabase[shortURL]) {
    delete urlDatabase[shortURL];
  }
  const templateVars = { urls: urlDatabase };
  res.redirect("/urls");
});

app.get("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const user = users[req.cookies["user_id"]];
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
    user: users[req.cookies["user_id"]],
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL", (req, res) => {
  const [shortURL, longURL] = [req.params.shortURL, req.body.longURL];
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

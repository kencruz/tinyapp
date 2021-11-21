const { users, urlDatabase } = require('../data');
const {
  generateRandomString,
  getUserByEmail,
  filterUrlByIdGenerator,
} = require('../helpers');
// returns urls owned by given user id
const urlsForUser = filterUrlByIdGenerator(urlDatabase);
const { Router } = require('express');
const routes = Router();
const bcrypt = require('bcryptjs');

const userController = require("./userController");

// at the root path redirect to /urls if logged in, else go to login page
routes.get('/', (req, res) => {
  if (users[req.session.userId]) {
    return res.redirect('/urls');
  }
  return res.redirect('/login');
});

// shows the user registration page
routes.get('/register', userController.getRegistrationForm);

// registers a new user
routes.post('/register', userController.createUser);

// endpoint for processing login credentials
routes.post('/login', userController.authenticateUser);

// show the login page
routes.get('/login', userController.getLoginPage);

// endpoint to log out user
routes.post('/logout', userController.logoutUser);

// the endpoint to view the form to create a new shortURL
routes.get('/urls/new', (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.userId];

  // unauthenticated users are redirected to /login
  if (!user) {
    return res.redirect('/login');
  }

  // authenticated users are shown the page to make new shortURLs
  const templateVars = { user };
  return res.render('urls_new', templateVars);
});

// the endpoint to create a new shortURL
routes.post('/urls', (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.userId];

  // unauthenticated users are shown the error page
  if (!user) {
    return res
      .status(403)
      .render('error', {
        user,
        error: "Unauthorized user can't add a url link.",
      });
  }

  // authenticated users will generate a new shortURL for their longURL and saved to database
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: user.id,
    visitors: {},
    trackingLog: [],
  };

  // redirect to the new shortURL page
  return res.redirect(`/urls/${shortURL}`);
});

// show a list of urls owned by user
routes.get('/urls', (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.userId];

  // unauthenticated users are shown the error page
  if (!user) {
    return res
      .status(403)
      .render('error', { user, error: 'Log in to view url page.' });
  }

  // build the urls owned by the user
  const templateVars = {
    urls: urlsForUser(user.id),
    user: user,
  };

  // render the url list with the user data
  return res.render('urls_index', templateVars);
});

// the endpoint to delete a shortURL
routes.delete('/urls/:shortURL', (req, res) => {
  // get shortURL from request body and try to get a valid user id from cookie
  const [shortURL, user] = [req.params.shortURL, users[req.session.userId]];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res
      .status(404)
      .render('error', { user, error: 'shortURL not found' });
  }

  // unauthenticated users are shown the error page
  if (!user) {
    return res
      .status(403)
      .render('error', {
        user,
        error: "Can't delete this link. User not logged in.",
      });
  }

  // users that don't own the specified url are shown the error page
  if (urlDatabase[shortURL].userID !== user.id) {
    return res
      .status(403)
      .render('error', {
        user,
        error: "Unauthorized user can't delete this link.",
      });
  }

  // if authenticated user owns the shortURL, then delete it
  if (urlDatabase[shortURL]) {
    delete urlDatabase[shortURL];
  }

  // go back to the url page
  return res.redirect('/urls');
});

// view the shortURL edit page
routes.get('/urls/:shortURL', (req, res) => {
  // get shortURL from request body and try to get a valid user id from cookie
  const [shortURL, user] = [req.params.shortURL, users[req.session.userId]];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res
      .status(404)
      .render('error', { user, error: 'shortURL not found.' });
  }

  // unauthenticated users are shown the error page
  if (!user) {
    return res
      .status(403)
      .render('error', {
        user,
        error: "Can't access shortURL page. User not logged in.",
      });
  }

  // users that don't own the specified url are shown the error page
  if (urlDatabase[shortURL].userID !== user.id) {
    return res
      .status(403)
      .render('error', {
        user,
        error: 'Unauthorized user to access shortURL page.',
      });
  }

  const {longURL, visitors, trackingLog} = urlDatabase[shortURL];

  const uniqueVisitorCount = Object.keys(visitors).length;
  const totalVisitorCount = Object.keys(visitors).reduce((acc, key) => acc + visitors[key], 0);

  // show authenticated user the rendered page with url data
  const templateVars = {
    user,
    shortURL,
    longURL,
    uniqueVisitorCount,
    totalVisitorCount,
    trackingLog,
  };
  return res.render('urls_show', templateVars);
});

// the endpoint to update the shortURL's longURL
routes.put('/urls/:shortURL', (req, res) => {
  // get shortURL, longURL from request body and try to get a valid user id from cookie
  const [shortURL, longURL, user] = [
    req.params.shortURL,
    req.body.longURL,
    users[req.session.userId],
  ];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res
      .status(404)
      .render('error', { user, error: 'shortURL not found.' });
  }

  // unauthenticated users are shown the error page
  if (!user) {
    return res
      .status(403)
      .render('error', {
        user,
        error: "Can't edit shortURL. User not logged in.",
      });
  }

  // users that don't own the specified url are shown the error page
  if (urlDatabase[shortURL].userID !== user.id) {
    return res
      .status(403)
      .render('error', {
        user,
        error: 'Unauthorized user to access shortURL page.',
      });
  }

  // update shortURL with new longURL and show the user's url page
  urlDatabase[shortURL].longURL = longURL;
  return res.redirect(`/urls/`);
});

// the endpoint to redirect shortURLs to their longURLs
routes.get('/u/:shortURL', (req, res) => {
  // get shortURL from request body and try to get a valid user id from cookie
  const [shortURL, user] = [req.params.shortURL, users[req.session.userId]];

  // invalid shortURLs are shown the error page
  if (!urlDatabase[shortURL]) {
    return res
      .status(404)
      .render('error', { user, error: 'Short link not found' });
  }

  // if no visitorId, create one
  if (!req.session.visitorId) {
    req.session.visitorId = generateRandomString();
  }
  const visitorId = req.session.visitorId;

  // once successfully validated, redirect to longURL
  const longURL = urlDatabase[shortURL].longURL;
  // increment visitor counters
  if (!urlDatabase[shortURL].visitors[visitorId]) {
    urlDatabase[shortURL].visitors[visitorId] = 0;
  }
  urlDatabase[shortURL].visitors[visitorId]++;
  // Track the visit
  urlDatabase[shortURL].trackingLog.push({timestamp: new Date(), visitorId});
  return res.redirect(longURL);
});

module.exports = routes;

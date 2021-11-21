const { users, urlDatabase } = require('../data');
const {
  generateRandomString,
} = require('../helpers');
// returns urls owned by given user id
const { Router } = require('express');
const routes = Router();

const userController = require("./userController");
const urlController = require("./urlController");

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
routes.get('/urls/new', urlController.getShortURLForm);

// the endpoint to create a new shortURL
routes.post('/urls', urlController.createShortUrl);

// show a list of urls owned by user
routes.get('/urls', urlController.getUrls);

// the endpoint to delete a shortURL
routes.delete('/urls/:shortURL', urlController.deleteUrl);

// view the shortURL edit page
routes.get('/urls/:shortURL', urlController.getShortURLEditPage);

// the endpoint to update the shortURL's longURL
routes.put('/urls/:shortURL', urlController.updateShortUrl);

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

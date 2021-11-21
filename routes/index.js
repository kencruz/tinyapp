const { users } = require('../data');
// returns urls owned by given user id
const { Router } = require('express');
const routes = Router();

const userController = require("./userController");
const urlController = require("./urlController");
const redirectShortUrlController = require("./shortUrlRedirectController");

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
routes.get('/u/:shortURL', redirectShortUrlController.redirectShortUrl);

module.exports = routes;

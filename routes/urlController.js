const { users, urlDatabase } = require('../data');
const {
  generateRandomString,
  filterUrlByIdGenerator
} = require('../helpers');
const urlsForUser = filterUrlByIdGenerator(urlDatabase);

const getShortURLForm = (req, res) => {
  // try to get a valid user id from cookie
  const user = users[req.session.userId];

  // unauthenticated users are redirected to /login
  if (!user) {
    return res.redirect('/login');
  }

  // authenticated users are shown the page to make new shortURLs
  const templateVars = { user };
  return res.render('urls_new', templateVars);
};

const createShortUrl = (req, res) => {
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
};

const getUrls = (req, res) => {
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
};

const deleteUrl = (req, res) => {
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
};

const getShortURLEditPage = (req, res) => {
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
};

const updateShortUrl = (req, res) => {
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
};

module.exports = {
  getShortURLForm,
  createShortUrl,
  getUrls,
  deleteUrl,
  getShortURLEditPage,
  updateShortUrl,
};

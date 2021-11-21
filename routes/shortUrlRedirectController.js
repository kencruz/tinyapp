const { users, urlDatabase } = require('../data');
const {
  generateRandomString,
} = require('../helpers');

const redirectShortUrl = (req, res) => {
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
};

module.exports = {
  redirectShortUrl
};

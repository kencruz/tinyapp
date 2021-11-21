const express = require('express');
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const routes = require('./routes');

// set up middleware to read request body easily
app.use(bodyParser.urlencoded({ extended: true }));

// set up middleware to use encrypted cookies
app.use(
  cookieSession({
    name: 'session',
    keys: ['break this plz', "actually don't, be nice"],
  })
);

// workaround for HTML to utilize REST methods
app.use(methodOverride('_method'));

// use ejs templates for the html pages
app.set('view engine', 'ejs');

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


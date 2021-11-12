// returns a random 6-digit alphanumeric string
const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

// gets user object from database with the matching email
const getUserByEmail = (email, database) => {
  for (const id in database) {
    // returns user object if matches email
    if (database[id].email === email) {
      return database[id];
    }
  }
  return undefined;
};

// generator function to filter urls by the user id
const filterUrlByIdGenerator = (urlDatabase) => {
  return (id) => {
    const urls = {};
    for (const shortURL in urlDatabase) {
      // only insert shortURLs if id matches
      if (urlDatabase[shortURL].userID === id) {
        urls[shortURL] = urlDatabase[shortURL];
      }
    }
    return urls;
  };
};

module.exports = {generateRandomString, getUserByEmail, filterUrlByIdGenerator};

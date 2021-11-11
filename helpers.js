const getUserByEmail = (email, database) => {
  let user;
  for (const id in database) {
    if (database[id].email === email) {
      user = database[id];
    }
  }
  return user;
};

module.exports = {getUserByEmail};

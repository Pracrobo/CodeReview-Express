const issueModel = require("../models/issueModels");

const findUser = async (userName) => {
  const user = await issueModel.getUserByName(userName);
  if (!user) throw new Error("User not found");
  return user;
};

module.exports = { findUser };

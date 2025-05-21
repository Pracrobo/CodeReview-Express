const repoModel = require("../models/repositoryModels");

const findUser = async (userName) => {
  const user = await repoModel.getUserByName(userName);
  if (!user) throw new Error("User not found");
  return user;
};

module.exports = { findUser };

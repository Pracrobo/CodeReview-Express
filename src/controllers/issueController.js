const issueService = require("../services/issueService");

const getUser = async (req, res, next) => {
  try {
    const user = await issueService.findUser(req.params.name);
    res.json(user);
  } catch (err) {
    next(err); // 에러 미들웨어로 넘김
  }
};

module.exports = { getUser };

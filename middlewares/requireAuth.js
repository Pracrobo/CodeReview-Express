function requireAuth(req, res, next) {
  if (!req.user) {
      console.warn("User information missing for repository addition attempt.");
    return res.status(401).json({ message: '권한이 없습니다.' });
  }
  next();
}

module.exports = requireAuth;
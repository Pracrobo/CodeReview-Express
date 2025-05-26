function validatePagination(req, res, next) {
  const { page, per_page } = req.query;

  if (!page || !per_page) {
    return res.status(400).json({ error: '잘못된 요청' });
  }
  next();
}

export default validatePagination;

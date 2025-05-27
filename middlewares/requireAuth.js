// 요청에 사용자 인증 정보(req.user)가 있는지 확인하는 미들웨어
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
    });
  }
  next();
}

export default requireAuth;

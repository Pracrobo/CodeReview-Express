// 전역 에러 핸들링 미들웨어
const errorHandler = (err, req, res, next) => {
  console.error('서버 에러:', err.stack);

  // JWT 인증 오류 처리
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.',
    });
  }

  // 기타 오류 처리
  res.status(500).json({
    success: false,
    message: err.message || '서버 내부 오류가 발생했습니다.',
  });
};

export default errorHandler;

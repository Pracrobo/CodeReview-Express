import { expressjwt } from 'express-jwt';

// JWT 토큰 검증 미들웨어
export const verifyJWT = expressjwt({
  secret: process.env.JWT_SECRET, // JWT 서명 검증을 위한 시크릿 키
  algorithms: ['HS256'], // 토큰 서명에 사용된 알고리즘
  requestProperty: 'user', // req 객체에서 디코딩된 JWT 페이로드를 참조할 속성 이름 (기본값: req.auth)
  getToken: function fromHeaderOrQuerystring(req) {
    // Authorization 헤더에서 토큰 추출
    if (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Bearer'
    ) {
      return req.headers.authorization.split(' ')[1];
    }
    // 쿼리 파라미터에서 토큰 추출 (대안)
    else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  },
});

// 인증 필수 확인 미들웨어 (GitHub 토큰 정보 추가)
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
    });
  }

  // GitHub 토큰 추출 (우선순위 순으로 시도)
  let githubAccessToken = null;

  // 쿠키에서 추출
  if (req.cookies?.githubAccessToken) {
    githubAccessToken = req.cookies.githubAccessToken;
  }
  // Authorization 헤더에서 추출
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    githubAccessToken = req.headers.authorization.substring(7);
  }
  // 쿼리 파라미터에서 추출
  else if (req.query?.githubToken) {
    githubAccessToken = req.query.githubToken;
  }

  // req.user에 GitHub 토큰 추가
  if (githubAccessToken) {
    req.user.githubAccessToken = githubAccessToken;
  }

  next();
};

// 에러 처리 미들웨어
export const handleAuthError = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다. 다시 로그인해주세요.',
      error: err.message,
    });
  }
  next(err);
};

// JWT 검증 + 인증 확인을 한번에 처리하는 통합 미들웨어
export const authenticate = [verifyJWT, requireAuth, handleAuthError];

// 기본 내보내기 (하위 호환성)
export default requireAuth;

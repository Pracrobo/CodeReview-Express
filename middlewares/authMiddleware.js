import { expressjwt } from 'express-jwt';

// JWT 토큰 검증 미들웨어
export const verifyJWT = expressjwt({
  secret: process.env.JWT_SECRET, // JWT 서명 검증을 위한 시크릿 키
  algorithms: ['HS256'], // 토큰 서명에 사용된 알고리즘
  requestProperty: 'user', // req 객체에서 디코딩된 JWT 페이로드를 참조할 속성 이름 (기본값: req.auth)
});

// 인증 필수 확인 미들웨어
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
    });
  }
  next();
};

// JWT 검증 + 인증 확인을 한번에 처리하는 통합 미들웨어
export const authenticate = [verifyJWT, requireAuth];

// 기본 내보내기 (하위 호환성)
export default requireAuth;

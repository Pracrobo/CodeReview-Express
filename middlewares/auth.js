import { expressjwt } from 'express-jwt';

// JWT 토큰을 검증하고, 성공 시 req.user에 디코딩된 페이로드를 저장하는 미들웨어
export const verifyJWT = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'user', // req.user에 디코딩된 JWT 페이로드 저장
});

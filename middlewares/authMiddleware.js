import { expressjwt } from 'express-jwt';
import morgan from 'morgan';

export const logger = morgan('dev');

export const verifyJWT = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'user', // req.user에 디코딩된 정보 저장
});
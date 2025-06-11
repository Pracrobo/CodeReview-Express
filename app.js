import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import { handleAuthError } from './middlewares/authMiddleware.js';
import cookieParser from 'cookie-parser';

const app = express();

// 쿠키 파서를 가장 먼저 설정
app.use(cookieParser());

// CORS 설정 개선 - credentials 처리 강화
const corsOptions = {
  origin: function (origin, callback) {
    // 개발 환경에서는 localhost 관련 모든 origin 허용
    if (process.env.NODE_ENV === 'development') {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // 프로덕션에서는 허용된 origin만
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS 정책에 의해 차단됨'));
  },
  credentials: true, // 쿠키 포함 필수
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Set-Cookie'], // Set-Cookie 헤더 노출
  preflightContinue: false,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganFormat =
  process.env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat));

app.use('/', routes);

// 에러 처리 미들웨어 (라우터 등록 후)
app.use(handleAuthError);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

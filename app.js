import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import { handleAuthError } from './middlewares/authMiddleware.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganFormat =
  process.env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat));

// 라우터 등록
app.use('/', routes);

// 에러 처리 미들웨어 (라우터 등록 후)
app.use(handleAuthError);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

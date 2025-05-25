import dotenv from 'dotenv';
dotenv.config();

const config = {
  MYSQL_HOST: process.env.MYSQL_HOST,
  MYSQL_PORT: process.env.MYSQL_PORT,
  MYSQL_USER: process.env.MYSQL_USER,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
  MYSQL_DB: process.env.MYSQL_DB,
};

// 환경 변수 로드 상태 확인
console.log('데이터베이스 설정 확인:', {
  host: config.MYSQL_HOST || '설정되지 않음',
  port: config.MYSQL_PORT || '설정되지 않음',
  user: config.MYSQL_USER || '설정되지 않음',
  database: config.MYSQL_DB || '설정되지 않음',
  password: config.MYSQL_PASSWORD ? '설정됨' : '설정되지 않음',
});

export default config;

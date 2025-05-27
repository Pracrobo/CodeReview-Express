import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const dbConfig = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 개발 환경이 아닐 때만 데이터베이스 설정 정보 로깅 (프로덕션에서는 민감 정보 로깅 방지)
if (process.env.NODE_ENV === 'development') {
  console.debug('데이터베이스 설정:', {
    host: dbConfig.host || '설정되지 않음',
    port: dbConfig.port || '설정되지 않음',
    user: dbConfig.user || '설정되지 않음',
    database: dbConfig.database || '설정되지 않음',
    password: dbConfig.password ? '설정됨' : '설정되지 않음',
  });
}

let connection_pool;

// DB 커넥션 풀 반환 (싱글톤)
function getConnectionPool() {
  if (!connection_pool) {
    connection_pool = mysql.createPool(dbConfig);
    console.log('DB 커넥션 풀이 성공적으로 생성되었습니다.');
  }
  return connection_pool;
}

export { dbConfig, getConnectionPool };

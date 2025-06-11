import crypto from 'crypto';

// 사용자 인증 토큰 관리 유틸리티 (GitHub 로그인 필수)
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default {
  generateRefreshToken,
  hashToken,
};

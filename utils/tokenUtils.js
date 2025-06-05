import crypto from 'crypto';

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
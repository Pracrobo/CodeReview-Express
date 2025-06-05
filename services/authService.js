import jwt from 'jsonwebtoken';
import UserModel from '../models/User.js';
import TokenUtils from '../utils/tokenUtils.js';
import GithubApiService from './githubApiService.js';

// Refresh Token TTL (7일, ms)
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function processGithubLogin(code) {
  if (!code) {
    throw new Error('GitHub 인증 코드가 필요합니다.');
  }

  const githubAccessToken = await GithubApiService.getAccessToken(code);
  const githubProfile = await GithubApiService.getUserInfo(githubAccessToken);

  let email = githubProfile.email;
  if (!email) {
    const githubEmails = await GithubApiService.getUserEmails(githubAccessToken);
    const primaryEmail = githubEmails.find((e) => e.primary && e.verified);
    email = primaryEmail?.email || githubEmails[0]?.email || '';
  }

  let dbUser = await UserModel.findUserByGithubId(githubProfile.id);

  if (!dbUser) {
    dbUser = await UserModel.createUser({
      githubId: githubProfile.id,
      username: githubProfile.login,
      email,
      avatarUrl: githubProfile.avatar_url,
    });
  }

  const jwtPayload = {
    userId: dbUser.userId,
    githubId: dbUser.githubId,
    username: dbUser.username,
    email: dbUser.email,
    avatarUrl: dbUser.avatarUrl,
  };

  const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

  // refreshToken 생성 및 해싱
  const refreshToken = TokenUtils.generateRefreshToken();
  const hashedRefreshToken = TokenUtils.hashToken(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS); // 7일

  // DB에 해시값과 만료일 저장
  await UserModel.updateUserRefreshToken(dbUser.userId, hashedRefreshToken, refreshTokenExpiresAt);

  return {
    accessToken,
    userId: dbUser.userId,
    username: dbUser.username,
    email: dbUser.email,
    avatarUrl: dbUser.avatarUrl,
    githubAccessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

async function unlinkGithub(githubAccessToken) {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await GithubApiService.unlinkGithub(githubAccessToken);
}

async function logoutGithub(githubAccessToken) {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await GithubApiService.logoutGithub(githubAccessToken);
}

export default {
  processGithubLogin,
  unlinkGithub,
  logoutGithub,
};

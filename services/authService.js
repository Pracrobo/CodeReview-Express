import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser, updateUserRefreshToken } from '../models/User.js';
import { generateRefreshToken, hashToken } from '../utils/tokenUtils.js';
import { githubApiService } from './githubApiService.js';

// Refresh Token TTL (7일, ms)
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const processGithubLogin = async (code) => {
  if (!code) {
    throw new Error('GitHub 인증 코드가 필요합니다.');
  }

  const githubAccessToken = await githubApiService.getAccessToken(code);
  const githubProfile = await githubApiService.getUserInfo(githubAccessToken);

  let email = githubProfile.email;
  if (!email) {
    const githubEmails = await githubApiService.getUserEmails(githubAccessToken);
    const primaryEmail = githubEmails.find((e) => e.primary && e.verified);
    email = primaryEmail?.email || githubEmails[0]?.email || '';
  }

  let dbUser = await findUserByGithubId(githubProfile.id);

  if (!dbUser) {
    dbUser = await createUser({
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
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS); // 7일

  // DB에 해시값과 만료일 저장
  await updateUserRefreshToken(dbUser.userId, hashedRefreshToken, refreshTokenExpiresAt);

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
};

export const unlinkGithub = async (githubAccessToken) => {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await githubApiService.unlinkGithub(githubAccessToken);
};

export const logoutGithub = async (githubAccessToken) => {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await githubApiService.logoutGithub(githubAccessToken);
};

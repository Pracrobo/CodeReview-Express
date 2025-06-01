import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser, updateUserRefreshToken } from '../models/User.js';
import { githubApiService } from './githubApiService.js';
import { generateRefreshToken, hashToken } from '../utils/tokenUtils.js';

export const processGithubLogin = async (code) => {
  if (!code) {
    throw new Error('GitHub 인증 코드가 필요합니다.');
  }

  const githubAccessToken = await githubApiService.getAccessToken(code);
  const githubUser = await githubApiService.getUserInfo(githubAccessToken);

  let email = githubUser.email;
  if (!email) {
    const emails = await githubApiService.getUserEmails(githubAccessToken);
    const primaryEmail = emails.find((e) => e.primary && e.verified);
    email = primaryEmail?.email || emails[0]?.email || '';
  }

  let user = await findUserByGithubId(githubUser.id);

  if (!user) {
    user = await createUser({
      githubId: githubUser.id,
      username: githubUser.login,
      email,
      avatarUrl: githubUser.avatar_url,
    });
  }

  const tokenPayload = {
    id: user.userId,
    githubId: user.githubId,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

  // refreshToken 생성 및 해싱
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(refreshToken);
  const refreshTokenExpiresIn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

  // DB에 해시값과 만료일 저장
  await updateUserRefreshToken(user.userId, hashedRefreshToken, refreshTokenExpiresIn);

  return {
    token,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    githubAccessToken,
    refreshToken, // 원본 반환
    refreshTokenExpiresIn,
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

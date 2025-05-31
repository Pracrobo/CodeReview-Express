import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser } from '../models/User.js';
import { githubApiService } from './githubApiService.js';

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

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  return {
    token,
    githubAccessToken,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
};

export const disconnectGithub = async (githubAccessToken) => {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await githubApiService.disconnectGithub(githubAccessToken);
};

export const logoutGithub = async (githubAccessToken) => {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await githubApiService.logoutGithub(githubAccessToken);
};

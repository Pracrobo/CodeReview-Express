import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser } from '../models/User.js';
import { githubService } from './githubApiService.js';

export const processGithubLogin = async (code) => {
  if (!code) {
    throw new Error('GitHub 인증 코드가 필요합니다.');
  }

  const accessToken = await githubService.getAccessToken(code);
  const githubUser = await githubService.getUserInfo(accessToken);

  let email = githubUser.email;
  if (!email) {
    const emails = await githubService.getUserEmails(accessToken);
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
    githubAccessToken: accessToken,
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  return {
    token,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    githubAccessToken: accessToken,
  };
};

export const revokeGithubToken = async (githubAccessToken) => {
  if (!githubAccessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다.');
  }
  await githubService.revokeAccessToken(githubAccessToken);
};

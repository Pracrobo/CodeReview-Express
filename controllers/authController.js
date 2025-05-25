import { githubService } from '../services/githubService.js';
import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser } from '../database/userRepository.js';

export const login = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&allow_signup=true&prompt=login`;
  res.redirect(githubAuthUrl);
};

export const callback = async (req, res) => {
  const { code } = req.query;
  try {
    const accessToken = await githubService.getAccessToken(code);
    const userInfo = await githubService.getUserInfo(accessToken);

    // 이메일 처리
    let email = userInfo.email;
    if (!email) {
      const emails = await githubService.getUserEmails(accessToken);
      const primaryEmail = emails.find(e => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : (emails[0]?.email || '');
    }

    // DB에서 사용자 조회
    let user = await findUserByGithubId(userInfo.id);
    if (!user) {
      // 새 사용자 생성
      user = await createUser({
        githubId: userInfo.id,
        username: userInfo.login,
        email,
        avatar_url: userInfo.avatar_url,
      });
    }

    // JWT 발급 (avatar_url 포함)
    const token = jwt.sign(
      {
        id: user ? user.user_id : undefined,
        githubId: user ? user.github_user_id : userInfo.id,
        username: user ? user.username : userInfo.login,
        email: user ? user.email : email,
        avatar_url: user ? user.avatar_url : userInfo.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 프론트엔드로 리다이렉트
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/oauth/callback?token=${token}&username=${encodeURIComponent(user ? user.username : userInfo.login)}&email=${encodeURIComponent(user ? user.email : email)}&avatar_url=${encodeURIComponent(user ? user.avatar_url : userInfo.avatar_url)}`
    );
  } catch (err) {
    console.error('OAuth Callback Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(403).json({ message: 'A token is required for logout' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DB에서 사용자 조회
    const user = await findUserByGithubId(decoded.githubId);

    if (user && user.accessToken) {
      await githubService.revokeAccessToken(user.accessToken);
      // accessToken을 DB에 저장하지 않았다면 이 부분은 생략해도 됩니다.
    }

    res.json({ message: 'Logged out and GitHub app authorization revoked' });
  } catch (err) {
    console.error('Logout Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};

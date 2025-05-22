import { githubService } from '../services/githubService.js';
import jwt from 'jsonwebtoken';

const users = []; // 실제 서비스에서는 DB 사용

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

    // 사용자 정보 저장
    let user = users.find(u => u.githubId === userInfo.id);
    if (!user) {
      user = {
        id: users.length + 1,
        githubId: userInfo.id,
        username: userInfo.login,
        avatar_url: userInfo.avatar_url,
        email,
        accessToken,
      };
      users.push(user);
    } else {
      user.email = email;
      user.avatar_url = userInfo.avatar_url;
      user.accessToken = accessToken;
    }

    // JWT 발급 (avatar_url 포함)
    const token = jwt.sign(
      {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 프론트엔드로 리다이렉트 (avatar_url도 전달)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/oauth/callback?token=${token}&username=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}&avatar_url=${encodeURIComponent(user.avatar_url)}`
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
    const user = users.find(u => u.id === decoded.id);

    if (user && user.accessToken) {
      await githubService.revokeAccessToken(user.accessToken);
      user.accessToken = null;
    }

    res.json({ message: 'Logged out and GitHub app authorization revoked' });
  } catch (err) {
    console.error('Logout Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};
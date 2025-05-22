import { githubService } from '../services/githubService.js';
import jwt from 'jsonwebtoken';

// 임시 메모리 사용자 저장 (실제 서비스에서는 DB로 대체)
const users = [];

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

    // 사용자 정보 저장 (DB로 대체 가능)
    let user = users.find(u => u.githubId === userInfo.id);
    if (!user) {
      user = {
        id: users.length + 1,
        githubId: userInfo.id,
        username: userInfo.login,
        avatarUrl: userInfo.avatar_url, // avatar_url 저장
        email,
      };
      users.push(user);
    } else {
      user.email = email;
      user.avatar_url = userInfo.avatar_url;
    }

    // JWT 발급 (avatarUrl 포함)
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/oauth/callback?token=${token}&username=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}&avatar_url=${encodeURIComponent(user.avatar_url)}`
    );
  } catch (err) {
    console.error('OAuth Callback Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};

export const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};
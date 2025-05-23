import { githubService } from '../services/githubService.js';
import jwt from 'jsonwebtoken';
// User 모델 임시 구현 (실제 DB 모델로 교체 필요)
const users = []; // 임시 메모리 저장

export const login = (req, res) => {
  // GitHub OAuth URL로 리다이렉트
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  res.redirect(githubAuthUrl);
};

export const callback = async (req, res) => {
  const { code } = req.query;
  try {
    const accessToken = await githubService.getAccessToken(code);
    const userInfo = await githubService.getUserInfo(accessToken);

    // DB 대신 임시 users 배열 사용
    let user = users.find(u => u.githubId === userInfo.id);
    if (!user) {
      user = {
        id: users.length + 1,
        githubId: userInfo.id,
        username: userInfo.login,
        avatarUrl: userInfo.avatar_url,
      };
      users.push(user);
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};
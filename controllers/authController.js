import { githubService } from '../services/githubService.js';
import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser, deleteUserByGithubId } from '../database/userRepository.js';

export const login = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&allow_signup=true&prompt=login`;
  res.redirect(githubAuthUrl);
};

// GET /github/callback: code를 프론트엔드로 리다이렉트
export const githubRedirect = (req, res) => {
  const code = req.query.code;
  const frontendUrl = process.env.FRONTEND_URL;
  res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
};

// POST /github/callback: code를 받아 토큰 등 JSON 응답
export const callback = async (req, res) => {
  const code = req.body.code;
  if (!code) {
    return res.status(400).json({ message: 'code is required' });
  }
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

    // JWT 발급
    const token = jwt.sign(
      {
        id: user.user_id,
        githubId: user.github_user_id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 프론트엔드로 JSON 응답
    res.json({
      token,
      accessToken,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
    });
  } catch (err) {
    console.error('OAuth Callback Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};

export const logout = async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ message: 'access_token is required' });
    }
    await githubService.revokeAccessToken(access_token);
    res.json({ message: 'Logged out and GitHub app authorization revoked' });
  } catch (err) {
    console.error('Logout Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(403).json({ message: 'A token is required for account deletion' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DB에서 사용자 삭제
    await deleteUserByGithubId(decoded.githubId);

    res.json({ message: 'User account deleted' });
  } catch (err) {
    console.error('Delete Account Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Internal server error', error: err?.response?.data || err.message || err });
  }
};

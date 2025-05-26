import { githubService } from '../services/githubService.js';
import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser, deleteUserByGithubId } from '../database/userRepository.js';

// GitHub 로그인 페이지로 리다이렉트
export const login = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&allow_signup=true&prompt=login`;
  res.redirect(githubAuthUrl);
};

// GitHub에서 받은 code를 프론트엔드로 리다이렉트
export const githubRedirect = (req, res) => {
  const code = req.query.code;
  const frontendUrl = process.env.FRONTEND_URL;
  res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
};

// code를 받아 토큰 및 사용자 정보 발급
export const callback = async (req, res) => {
  const code = req.body.code;
  if (!code) {
    return res.status(400).json({ message: '코드가 필요합니다.' });
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

    // DB에서 사용자 조회 또는 생성
    let user = await findUserByGithubId(userInfo.id);
    if (!user) {
      user = await createUser({
        githubId: userInfo.id,
        username: userInfo.login,
        email,
        avatarUrl: userInfo.avatar_url,
      });
    }

    // JWT 발급
    const token = jwt.sign(
      {
        id: user.userId,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
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
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.error('OAuth Callback Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: '내부 서버 오류', error: err?.response?.data || err.message || err });
  }
};

// 로그아웃 및 GitHub 연동 해제
export const logout = async (req, res) => {
  try {
    const accessToken = req.body.accessToken;
    if (!accessToken) {
      return res.status(400).json({ message: 'accessToken이 필요합니다.' });
    }
    await githubService.revokeAccessToken(accessToken);
    res.json({ message: '로그아웃 및 GitHub 연동 해제 완료' });
  } catch (err) {
    console.error('Logout Error:', err?.response?.data || err.message || err);
    res.status(500).json({ message: '내부 서버 오류', error: err?.response?.data || err.message || err });
  }
};

// 계정 삭제
export const deleteAccount = async (req, res) => {
  try {
    // verifyJWT 미들웨어에서 이미 토큰 검증 완료
    const { githubId } = req.user;

    // DB에서 사용자 삭제
    await deleteUserByGithubId(githubId);

    res.json({ message: '계정이 삭제되었습니다.' });
  } catch (err) {
    console.error(
      'Delete Account Error:',
      err?.response?.data || err.message || err
    );
    res.status(500).json({
      message: '서버 내부 오류',
      error: err?.response?.data || err.message || err,
    });
  }
};
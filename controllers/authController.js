import {
  processGithubLogin,
  logoutGithub,
} from '../services/authService.js';
import { deleteUserByGithubId } from '../models/User.js';

// GitHub 로그인 페이지로 리다이렉트
export const login = (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email&allow_signup=true&prompt=login`;
  res.redirect(githubAuthUrl);
};

// GitHub OAuth 콜백 처리: 받은 코드를 프론트엔드로 리다이렉트
export const githubRedirect = (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
};

// 프론트엔드에서 받은 code로 실제 로그인 처리 및 JWT 발급
export const callback = async (req, res, next) => {
  const { code } = req.body;

  try {
    const authResult = await processGithubLogin(code);

    // githubAccessToken을 HttpOnly 쿠키로만 저장
    res.cookie('githubAccessToken', authResult.githubAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1시간
    });

    const { token, username, email, avatarUrl } = authResult;
    res.json({
      success: true,
      token,
      username,
      email,
      avatarUrl,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 로그아웃: GitHub 액세스 토큰 철회
export const logout = async (req, res) => {
  try {
    // 쿠키에서 토큰 읽기
    const githubAccessToken = req.cookies.githubAccessToken;

    if (!githubAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub 액세스 토큰 정보가 없습니다.',
      });
    }

    await logoutGithub(githubAccessToken);

    // 쿠키 삭제
    res.clearCookie('githubAccessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({
      success: true,
      message: '로그아웃이 완료되었습니다.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 계정 삭제
export const deleteAccount = async (req, res) => {
  try {
    const { githubId } = req.user;

    if (!githubId) {
      return res.status(400).json({
        success: false,
        message: 'GitHub 사용자 ID 정보가 없습니다.',
      });
    }

    await deleteUserByGithubId(githubId);

    res.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

import {
  processGithubLogin,
  logoutGithub,
  unlinkGithub,
} from '../services/authService.js';
import { deleteUserByGithubId, getUserByRefreshToken, clearUserRefreshToken } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { hashToken } from '../utils/tokenUtils.js';

// GitHub 액세스 토큰 쿠키 삭제 헬퍼 함수
function clearGithubAccessTokenCookie(res) {
  res.clearCookie('githubAccessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

// refreshToken 쿠키 삭제 헬퍼
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

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

    // githubAccessToken 쿠키
    res.cookie('githubAccessToken', authResult.githubAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });

    // refreshToken 쿠키
    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { token, username, email, avatarUrl } = authResult;
    res.json({ success: true, token, username, email, avatarUrl });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GitHub 로그아웃
export const logout = async (req, res) => {
  try {
    const githubAccessToken = req.cookies.githubAccessToken;
    const userId = req.user?.id;

    if (githubAccessToken) {
      await logoutGithub(githubAccessToken);
      clearGithubAccessTokenCookie(res);
    }
    clearRefreshTokenCookie(res);

    if (userId) {
      await clearUserRefreshToken(userId);
    }

    res.json({ success: true, message: '로그아웃 되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GitHub 계정 연동 해제
export const unlink = async (req, res) => {
  try {
    const githubAccessToken = req.cookies.githubAccessToken;

    if (!githubAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub 액세스 토큰 정보가 없습니다.',
      });
    }

    await unlinkGithub(githubAccessToken);

    clearGithubAccessTokenCookie(res);

    res.json({
      success: true,
      message: 'GitHub 계정 연동이 해제되었습니다.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GitHub 계정 데이터 삭제
export const deleteAccount = async (req, res) => {
  try {
    const githubId = req.user?.githubId;
    const userId = req.user?.id;

    if (!githubId || !userId) {
      return res.status(400).json({ success: false, message: '사용자 정보가 없습니다.' });
    }

    clearGithubAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
    await clearUserRefreshToken(userId);
    await deleteUserByGithubId(githubId);

    res.json({ success: true, message: '계정이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'refreshToken 없음' });
    }

    const hashed = hashToken(refreshToken);
    const user = await getUserByRefreshToken(hashed);

    if (!user || new Date() > user.refresh_token_expires_in) {
      return res.status(401).json({ success: false, message: 'refreshToken 만료 또는 불일치' });
    }

    const tokenPayload = {
      id: user.userId,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

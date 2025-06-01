import { processGithubLogin, logoutGithub, unlinkGithub } from '../services/authService.js';
import { deleteUserByGithubId, findUserByRefreshToken, clearUserRefreshToken } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { hashToken } from '../utils/tokenUtils.js';

// GitHub 액세스 토큰 쿠키 삭제 헬퍼 함수
function clearGithubAccessTokenCookie(res) {
  res.clearCookie('githubAccessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

// refreshToken 쿠키 삭제 헬퍼
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
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
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // refreshToken 쿠키
    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(authResult.refreshTokenExpiresAt),
    });

    const { accessToken, username, email, avatarUrl } = authResult;
    res.json({ success: true, accessToken, username, email, avatarUrl });
  } catch (error) {
    next(error);
  }
};

// GitHub 로그아웃
export const logout = async (req, res) => {
  try {
    const githubAccessToken = req.cookies.githubAccessToken;
    const refreshToken = req.cookies.refreshToken;

    clearGithubAccessTokenCookie(res);
    clearRefreshTokenCookie(res);

    if (refreshToken) {
      const hashed = hashToken(refreshToken);
      const dbUser = await findUserByRefreshToken(hashed);
      if (dbUser) {
        await clearUserRefreshToken(dbUser.userId);
      }
    }
    if (githubAccessToken) {
      await logoutGithub(githubAccessToken);
    }
    res.json({ success: true, message: '로그아웃 완료' });
  } catch (error) {
    res.status(500).json({ success: false, message: '로그아웃 중 오류 발생' });
  }
};

// GitHub 계정 연동 해제
export const unlink = async (req, res) => {
  try {
    const githubAccessToken = req.cookies.githubAccessToken;
    const refreshToken = req.cookies.refreshToken;

    clearGithubAccessTokenCookie(res);
    clearRefreshTokenCookie(res);

    if (refreshToken) {
      const hashed = hashToken(refreshToken);
      const dbUser = await findUserByRefreshToken(hashed);
      if (dbUser) {
        await clearUserRefreshToken(dbUser.userId);
      }
    }
    if (githubAccessToken) {
      await unlinkGithub(githubAccessToken);
    }
    res.json({ success: true, message: '계정 연동 해제 완료' });
  } catch (error) {
    res.status(500).json({ success: false, message: '계정 연동 해제 중 오류 발생' });
  }
};

// GitHub 계정 데이터 삭제
export const deleteAccount = async (req, res) => {
  try {
    const githubId = req.user?.githubId;
    const userId = req.user?.id;
    if (!githubId || !userId) {
      return res.status(400).json({ success: false, message: '사용자 인증 정보가 없습니다.' });
    }
    clearGithubAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
    await clearUserRefreshToken(userId);
    await deleteUserByGithubId(githubId);
    res.json({ success: true, message: '계정 삭제 완료' });
  } catch (error) {
    res.status(500).json({ success: false, message: '계정 삭제 중 오류 발생' });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'refreshToken 없음' });
    }
    const hashed = hashToken(refreshToken);
    const dbUser = await findUserByRefreshToken(hashed);
    if (!dbUser || new Date() > dbUser.refreshTokenExpiresAt) {
      return res.status(401).json({ success: false, message: 'refreshToken 만료 또는 불일치' });
    }
    const jwtPayload = {
      id: dbUser.userId,
      githubId: dbUser.githubId,
      username: dbUser.username,
      email: dbUser.email,
      avatarUrl: dbUser.avatarUrl,
    };
    const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(500).json({ success: false, message: '토큰 갱신 중 오류 발생' });
  }
};

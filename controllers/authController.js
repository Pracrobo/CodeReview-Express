import AuthService from '../services/authService.js';
import UserModel from '../models/User.js';
import jwt from 'jsonwebtoken';
import TokenUtils from '../utils/tokenUtils.js';

// GitHub 액세스 토큰 쿠키 삭제 헬퍼 함수
function clearGithubAccessTokenCookie(res) {
  res.clearCookie('githubAccessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    domain:
      process.env.NODE_ENV === 'production'
        ? process.env.COOKIE_DOMAIN
        : undefined,
  });
}

// refreshToken 쿠키 삭제 헬퍼 함수
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

// GitHub 로그인 페이지로 리다이렉트
function login(req, res) {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email&allow_signup=true&prompt=login`;
  res.redirect(githubAuthUrl);
}

// GitHub OAuth 콜백 처리: 받은 코드를 프론트엔드로 리다이렉트
function githubRedirect(req, res) {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
}

// 프론트엔드에서 받은 code로 실제 로그인 처리 및 JWT 발급
async function callback(req, res, next) {
  const { code } = req.body;
  try {
    const authResult = await AuthService.processGithubLogin(code);

    console.log('GitHub 로그인 성공, 토큰 쿠키 설정 시작');
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // 쿠키 옵션 개선 - 브라우저 호환성 향상
    const baseOptions = {
      httpOnly: true,
      secure: false, // 개발 환경에서는 false
      sameSite: 'lax',
      path: '/',
    };

    // githubAccessToken 쿠키 설정 (7일 유지)
    const githubTokenOptions = {
      ...baseOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    };

    // refreshToken 쿠키 설정 (만료 시간 명시)
    const refreshTokenOptions = {
      ...baseOptions,
      expires: new Date(authResult.refreshTokenExpiresAt),
    };

    console.log('GitHub 토큰 쿠키 옵션:', githubTokenOptions);
    console.log('Refresh 토큰 쿠키 옵션:', refreshTokenOptions);

    res.cookie(
      'githubAccessToken',
      authResult.githubAccessToken,
      githubTokenOptions
    );
    res.cookie('refreshToken', authResult.refreshToken, refreshTokenOptions);

    console.log('쿠키 설정 완료');

    const { accessToken } = authResult;
    res.json({
      success: true,
      accessToken,
      message: '로그인이 완료되었습니다.',
    });
  } catch (error) {
    console.error('GitHub 로그인 콜백 처리 중 오류:', error);
    next(error);
  }
}

// GitHub 로그아웃
async function logout(req, res) {
  try {
    const githubAccessToken = req.cookies?.githubAccessToken;
    const refreshToken = req.cookies?.refreshToken;

    console.log(
      '로그아웃 시작 - GitHub 토큰:',
      githubAccessToken ? '있음' : '없음'
    );

    // 쿠키 삭제 옵션 통일
    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };

    if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
      clearOptions.domain = process.env.COOKIE_DOMAIN;
    }

    // 쿠키 삭제
    res.clearCookie('githubAccessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    // 응답 먼저 전송
    res.json({ success: true, message: '로그아웃 완료' });

    // 비동기 정리 작업 (응답과 분리)
    setImmediate(async () => {
      try {
        // DB에서 refreshToken 삭제
        if (refreshToken) {
          const hashed = TokenUtils.hashToken(refreshToken);
          const dbUser = await UserModel.findUserByRefreshToken(hashed);
          if (dbUser) {
            await UserModel.clearUserRefreshToken(dbUser.userId);
            console.log('DB에서 refreshToken 삭제 완료');
          }
        }

        // GitHub 로그아웃 시도
        if (githubAccessToken) {
          await AuthService.logoutGithub(githubAccessToken);
          console.log('GitHub 로그아웃 완료');
        }
      } catch (error) {
        console.error('로그아웃 후처리 중 오류:', error.message);
        // 오류가 발생해도 사용자에게는 이미 성공 응답을 보냄
      }
    });
  } catch (error) {
    console.error('로그아웃 중 오류:', error);
    res.status(500).json({
      success: false,
      message: `로그아웃 중 오류가 발생했습니다. (${
        error?.message || '알 수 없는 오류'
      })`,
    });
  }
}

// GitHub 계정 연동 해제
async function unlink(req, res) {
  try {
    const githubAccessToken = req.cookies?.githubAccessToken;
    const refreshToken = req.cookies?.refreshToken;

    console.log(
      '연동 해제 시작 - GitHub 토큰:',
      githubAccessToken ? '있음' : '없음'
    );

    // 쿠키 삭제
    clearGithubAccessTokenCookie(res);
    clearRefreshTokenCookie(res);

    // DB에서 refreshToken 삭제
    if (refreshToken) {
      try {
        const hashed = TokenUtils.hashToken(refreshToken);
        const dbUser = await UserModel.findUserByRefreshToken(hashed);
        if (dbUser) {
          await UserModel.clearUserRefreshToken(dbUser.userId);
          console.log('DB에서 refreshToken 삭제 완료');
        }
      } catch (dbError) {
        console.error('DB refreshToken 삭제 중 오류:', dbError.message);
      }
    }

    // GitHub 연동 해제
    if (githubAccessToken) {
      try {
        await AuthService.unlinkGithub(githubAccessToken);
        console.log('GitHub 연동 해제 완료');
      } catch (githubError) {
        console.error('GitHub 연동 해제 중 오류:', githubError.message);
        // GitHub 연동 해제 실패해도 로컬 정리는 완료된 상태
      }
    }

    res.json({ success: true, message: '계정 연동 해제 완료' });
  } catch (error) {
    console.error('연동 해제 중 오류:', error);
    res.status(500).json({
      success: false,
      message: `계정 연동 해제 중 오류가 발생했습니다. (${
        error?.message || '알 수 없는 오류'
      })`,
    });
  }
}

// GitHub 계정 데이터 삭제
async function deleteAccount(req, res) {
  try {
    const githubId = req.user?.githubId;
    const userId = req.user?.userId;
    if (!githubId || !userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 인증 정보를 확인할 수 없습니다.',
      });
    }
    // 쿠키 삭제 및 DB에서 사용자 정보 삭제
    clearGithubAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
    await UserModel.clearUserRefreshToken(userId);
    await UserModel.deleteUserByGithubId(githubId);
    res.json({ success: true, message: '계정이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (${
        error?.message || '알 수 없는 오류'
      })`,
    });
  }
}

// refreshToken으로 accessToken 재발급
async function refreshAccessToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: 'refreshToken이 존재하지 않습니다.' });
    }
    const hashed = TokenUtils.hashToken(refreshToken);
    const dbUser = await UserModel.findUserByRefreshToken(hashed);
    if (!dbUser || new Date() > dbUser.refreshTokenExpiresAt) {
      return res.status(401).json({
        success: false,
        message: 'refreshToken이 만료되었거나 일치하지 않습니다.',
      });
    }
    const jwtPayload = {
      userId: dbUser.userId,
      githubId: dbUser.githubId,
      username: dbUser.username,
      email: dbUser.email,
      avatarUrl: dbUser.avatarUrl,
    };
    const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });
    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `토큰 갱신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (${
        error?.message || '알 수 없는 오류'
      })`,
    });
  }
}

export default {
  login,
  githubRedirect,
  callback,
  logout,
  unlink,
  deleteAccount,
  refreshAccessToken,
};

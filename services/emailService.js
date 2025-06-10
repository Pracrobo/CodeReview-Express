import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import Email from '../models/Email';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

let cachedAccessToken = null;
let accessTokenExpiresAt = null;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function savedToken() {
  const saved = await Email.selectRefreshTokenInfo();
  const refreshTokenExpiresAt = saved.refreshTokenExpiresAt;
  const refreshToken = saved.refreshToken;

  return {
    refreshToken: refreshToken,
    refreshTokenExpiresAt: refreshTokenExpiresAt,
  };
}
async function getAccessToken() {
  const now = Date.now();
  const refreshTokenExpiresAt = await savedToken.refreshTokenExpiresAt;
  if (
    !cachedAccessToken ||
    now >= accessTokenExpiresAt ||
    now >= refreshTokenExpiresAt
  ) {
    const { token: accessToken, res } = await oAuth2Client.getAccessToken();
    cachedAccessToken = accessToken;
    accessTokenExpiresAt = res.expiry_date; // number(ms)

    const refreshTokenExpiresInSec = res.refresh_token_expires_in || 3600;
    const refreshTokenExpiresAt = new Date(
      now + refreshTokenExpiresInSec * 1000
    );
    const refreshToken = res.refresh_token;
    await Email.upsertToken({
      refreshToken,
      refreshTokenExpiresAt,
    });

    const expiresIn = Math.floor((accessTokenExpiresAt - now) / 1000);
    console.log(`새 access 토큰 캐시. 만료까지 ${expiresIn}초`);
  } else {
    const expiresIn = Math.floor((accessTokenExpiresAt - now) / 1000);
    console.log(`기존 access 토큰 사용. 만료까지 ${expiresIn}초`);
  }

  return cachedAccessToken;
}

async function transporterService() {
  try {
    const accessToken = await getAccessToken();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        clientId: SERVICE_MAIL,
        clientSecret: SERVICE_PASSWORD,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });
    return transporter;
  } catch (error) {
    console.error('nodemail 설정 오류: ', error);
    throw new Error('서비스 장애');
  }
}

async function sendMail(userEmail, repoInfo, transporter) {
  const SERVICE_MAIL = process.env.SERVICE_MAIL;
  const transporter = await createTransporter();

  const mailOptions = {
    from: SERVICE_MAIL,
    to: userEmail,
    subject: `AISSUE: 신청하신 레포지토리 ${repoInfo.repoName} 분석이 도착했습니다.`,
    text: `이메일 알림 신청을 통해 분석 요청하신 레포지토리 ${
      repoInfo.repoName
    } 분석이 완료되었습니다. \n\n
      레포지토리  ${repoInfo.repoName} 분석결과는 ${
      repoInfo.result ? '성공' : '실패'
    } 입니다.`,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.log('transport 전송 에러 발생, 메세지 전송 실패:', error);
    return false;
  }
}

export default { transporterService, sendMail };

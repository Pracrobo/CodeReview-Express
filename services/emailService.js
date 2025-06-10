import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const SERVICE_MAIL = process.env.SERVICE_MAIL;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const SCOPE = process.env.GOOGLE_SCOPE;
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * OAuth2 클라이언트 생성
 */
function createOAuth2Client() {
  const { client_id, client_secret, refresh_token } = loadCredentialsFromJson();

  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  oAuth2Client.setCredentials({ refresh_token });

  return oAuth2Client;
}

/**
 * credentials.json에서 refresh_token 등 로드
 */
function loadCredentialsFromJson() {
  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      client_id: parsed.client_id,
      client_secret: parsed.client_secret,
      refresh_token: parsed.refresh_token,
    };
  } catch (err) {
    console.error('credentials.json 로드 실패:', err.message);
    throw err;
  }
}


/**
 * access_token 발급 받기
 */
async function getAccessTokenFromRefresh(oAuth2Client) {
  const { token } = await oAuth2Client.getAccessToken();
  return token;
}


async function transporterService() {
  try {
    const oAuth2Client = createOAuth2Client();
    const accessToken = await getAccessTokenFromRefresh(oAuth2Client);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: SERVICE_MAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: oAuth2Client.credentials.refresh_token,
        accessToken: accessToken,
      },
    });
    return transporter;
  } catch (error) {
    console.error('nodemail 설정 오류: ', error);
    throw new Error('메일 전송 시스템 에러');
  }
}

async function sendMail(userEmail, repoInfo, transporter) {
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

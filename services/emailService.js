import nodemailer from 'nodemailer';
import UserModel from '../models/User.js';

const SERVICE_MAIL = process.env.SERVICE_MAIL;
const SERVICE_PW = process.env.SERVICE_PASSWORD;
/**
 * UserModel에 이메일 전송 여부 저장하기
 */
async function saveEmailStatus(emailStatus, userId) {
  try {
    const result = await UserModel.updateUserEmailStatus(emailStatus, userId);
    return result;
  } catch (error) {
    console.error('db 저장 에러', error);
    return { success: false };
  }
}

async function selectEmailStatus(userId) {
  try {
    const result = await UserModel.selectUserEmailStatus(userId);
    if (result.success && result.isEnable) {
      return {
        success: true,
        userEmail: result.userEmail,
        isEnable: result.isEnable,
      };
    } else if (!result.isEnable) {
      return { success: result.success, isEnable: false };
    } else {
      return { success: result.success };
    }
  } catch (error) {
    console.error('db 조회 에러', error);
    return { success: false };
  }
}

/**
 * nodemailer - transporter 사용하기
 */

async function transporterService() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SERVICE_MAIL, // 이메일 주소는 여전히 필요
        pass: SERVICE_PW,
      },
    });

    transporter.on('token', (token) => {
      console.log(
        'A new access token was generated for service account:',
        token.accessToken
      );
      console.log('Expires:', new Date(token.expires));
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
    subject: `CodeReview: 신청하신 레포지토리 ${repoInfo.repoName} 분석이 도착했습니다.`,
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
    console.log(
      'transport 전송 에러 발생, 메세지 전송 실패:',
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return false;
  }
}

export default {
  saveEmailStatus,
  selectEmailStatus,
  transporterService,
  sendMail,
};

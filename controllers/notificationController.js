import UserModel from '../models/User.js';
import emailService from '../services/emailService.js';

const clientData = new Map();

function initializeSseConnection(req, res) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientName = req.query.clientName;
  if (!clientName) return res.status(400).end();

  console.log(`등록된 clientName: ${clientName}`);

  // 연결 확인 메시지
  res.write(
    `data: ${JSON.stringify({
      clientName,
      type: 'connected',
      message: '알림 서비스에 연결되었습니다.',
      timestamp: Date.now(),
    })}\n\n`
  );

  // ping 전송
  const intervalId = setInterval(() => {
    try {
      res.write(`: keep-alive\n\n`);
    } catch (e) {
      console.log(`${clientName} 연결 실패, 정리 중`);
      clearInterval(intervalId);
      clientData.delete(clientName);
      res.end();
    }
  }, 15000);

  // 일관된 구조로 저장
  clientData.set(clientName, { res, intervalId });

  // 연결 해제 처리
  req.on('close', () => {
    console.log(`클라이언트 연결 해제됨: ${clientName}`);
    clearInterval(intervalId);
    clientData.delete(clientName);
  });
}

// 클라이언트에게 알림 전송
async function pushBrowserNotification(userId, data) {
  try {
    const clientName = await UserModel.findUsernameByUserId(userId);
    if (!clientName) {
      console.error(
        `사용자 ID ${userId}에 해당하는 사용자 정보를 찾을 수 없거나 username이 없습니다.`
      );
      return;
    }
    const client = clientData.get(clientName);

    if (!client || !client.res) {
      console.error(`클라이언트 ${clientName}에 해당하는 연결이 없습니다.`);
      return;
    }
    const message = `data: ${JSON.stringify(data)}\n\n`;
    client.res.write(message);
  } catch (error) {
    console.error(`서버: 사용자 ID ${userId}에게 메시지 전송 실패:`, error);
  }
}
async function analysisCallback(data) {
  const repoInfo = { repoName: data.repoName, result: data.result };
  if (repoInfo) {
    console.log('유저가 분석 요청한 레포지토리가 있습니다.');
    return { analysisRequest: true, repoInfo: repoInfo };
  } else {
    console.log('유저가 분석 요청한 레포지토리가 아직 없습니다.');
    return { analysisRequest: false };
  }
}

async function sendEmailNotificationStatus(req, res) {
  const { status, userId, userEmail } = req.body;

  if (!userEmail) {
    console.error(`사용자 이메일 정보를 찾을 수 없습니다`);
    res
      .status(403)
      .json({ message: '사용자의 이메일 정보를 찾을 수 없습니다.' });
  }
  try {
    const saveDB = await emailService.saveEmailStatus(
      status,
      userId,
      userEmail
    );
    const sendEmail = await sendEmail(status, userId, userEmail);
    if (saveDB.success && sendEmail.success) {
      res.status(200).message('DB 저장 및 이메일 발송 준비 완료');
    } else {
      console.error('DB 저장 및 email 관련 발송 에러');
    }
  } catch (error) {
    console.error('DB or Email 발송 에러 발생');
  }
}

async function sendEmail(status, userId, userEmail) {
  const send = await analysisCallback();
  selectEmailStatus();
  if (send.analysisRequest) {
    try {
      const transporter = await emailService.transporterService();
      const sendMailResult = await emailService.sendMail(
        userEmail,
        send.repoInfo,
        transporter
      );
      if (sendMailResult) {
        res.status(204).json({ message: '메일 전송 성공' });
      } else {
        console.error(`사용자 이메일 ${userEmail}에 발송 실패:`, error);
        res.status(403).json({ message: '메일 전송 실패' });
      }
    } catch (error) {
      console.error(`이메일 서비스 실패:`, error);
      res.status(500).json({ message: '서버 오류로 메일 전송 실패' });
    }
  } else {
    console.log('사용자가 분석을 보낼떄까지 기다립니다.');
    res.status(201).json({ message: '메일 전송 대기중 ' });
  }
}

export default {
  initializeSseConnection,
  pushBrowserNotification,
  analysisCallback,
  sendEmailNotificationStatus,
};

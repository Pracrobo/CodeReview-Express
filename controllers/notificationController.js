import UserModel from '../models/User.js';
import emailService from '../services/emailService.js';
import repositoryController from './repositoryController.js';
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

async function sendEmailNotification(req, res) {
  const { status, userEmail } = req.body;
  // const repoInfo = await repositoryController.getAnalysisStatus;
  // WIP로직 구현해야 함
  const repoInfo = {
    repoName: `flask`,
    result: true,
  };
  if (!userEmail) {
    console.error(`사용자 이메일 정보를 찾을 수 없습니다`);
  }
  if (!repoInfo) {
    console.error('분석 에러 발생');
    res.status(500).json({ message: '저장소 분석 오류로 인한 메일 발송 불가' });
  }
  // 메일 수신 상태 여부
  if (status) {
    try {
      const transporter = await emailService.transporterService();
      const sendMailResult = await emailService.sendMail(
        userEmail,
        repoInfo,
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
    console.log('이메일 발송을 신청하지 않았습니다.');
  }
}

export default {
  initializeSseConnection,
  pushBrowserNotification,
  sendEmailNotification,
};

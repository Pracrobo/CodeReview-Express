import { findUsernameByUserId } from '../models/User.js';

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
async function pushNotification(userId, data) {
  try {
    const clientName = await findUsernameByUserId(userId);
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

export default { initializeSseConnection, pushNotification };

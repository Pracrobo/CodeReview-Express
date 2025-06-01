import { findUserByGithubId, updateProPlanStatus } from '../models/User.js';

// 결제 실패 처리
export const paymentFail = (req, res) => {
  return res.json({ success: false, message: '결제에 실패하였습니다.' });
};

// 결제 성공(플랜 활성화)
export const paymentComplete = async (req, res) => {
  const { githubId } = req.user;
  if (!githubId) {
    return res.status(400).json({ success: false, message: '사용자 인증 정보가 없습니다.' });
  }

  try {
    await updateProPlanStatus(githubId);
    return res.json({ success: true, message: 'Pro 플랜이 정상적으로 활성화되었습니다.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
};

// 결제/플랜 상태 조회
export const getPaymentStatus = async (req, res) => {
  const { githubId } = req.user;
  if (!githubId) {
    return res.status(401).json({ success: false, message: '인증된 사용자가 아닙니다.' });
  }

  try {
    const dbUser = await findUserByGithubId(githubId);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: '사용자 정보를 찾을 수 없습니다.' });
    }
    return res.json({
      username: dbUser.username,
      email: dbUser.email,
      avatarUrl: dbUser.avatarUrl,
      isProPlan: dbUser.isProPlan || false,
      proPlanExpiresAt: dbUser.proPlanExpiresAt || null,
      createdAt: dbUser.createdAt || null,
      updatedAt: dbUser.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '플랜 정보 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
};
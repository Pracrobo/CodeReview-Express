import { updateProPlanStatus } from '../models/User.js';
import { findUserByGithubId } from '../models/User.js';

export const paymentComplete = async (req, res) => {
  try {
    const { id } = req.user;
    if (!id) {
      return res.status(400).json({ success: false, message: '사용자 정보가 없습니다.' });
    }
    await updateProPlanStatus(id);
    res.json({ success: true, message: 'Pro 플랜이 활성화되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const paymentFail = async (req, res) => {
  res.json({ success: false, message: '결제 실패' });
};

// 결제/플랜 상태 조회
export const getPaymentStatus = async (req, res) => {
  try {
    const { githubId } = req.user;
    if (!githubId) {
      return res.status(401).json({ success: false, message: '인증 정보가 없습니다.' });
    }
    const user = await findUserByGithubId(githubId);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    res.json({
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isProPlan: user.isProPlan || false,
      proPlanExpiresAt: user.proPlanExpiresAt || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
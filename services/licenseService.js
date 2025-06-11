import LicenseModel from '../models/License.js';

async function getLicenseDetails(licenseSpdxId) {
  if (!licenseSpdxId) {
    return {
      success: true,
      data: null,
      message: '라이선스 ID가 제공되지 않았습니다.',
    };
  }
  try {
    const result = await LicenseModel.selectLicenseBySpdxId(licenseSpdxId);
    if (!result.success) {
      throw new Error(
        result.error || '라이선스 정보를 가져오는데 실패했습니다.'
      );
    }
    if (!result.data) {
      return {
        success: true,
        data: null,
        message: '해당 라이선스 정보를 찾을 수 없습니다.',
      };
    }
    return { success: true, data: result.data };
  } catch (error) {
    console.error(
      `LicenseService 오류 - getLicenseDetails(${licenseSpdxId}):`,
      error
    );
    return {
      success: false,
      message: error.message || '라이선스 정보 조회 중 서버 오류 발생',
    };
  }
}

export default {
  getLicenseDetails,
};

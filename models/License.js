import Database from '../database/database.js';

const pool = Database.getConnectionPool();

// SPDX ID로 라이선스 정보 조회
async function selectLicenseBySpdxId(licenseSpdxId) {
  if (!licenseSpdxId) {
    return { success: true, data: null }; // SPDX ID가 없으면 null 반환
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM licenses WHERE license_spdx_id = ?',
      [licenseSpdxId]
    );
    if (rows.length === 0) {
      return { success: true, data: null }; // 해당 라이선스 정보가 없으면 null 반환
    }
    // JSON 컬럼은 드라이버에 의해 자동으로 객체/배열로 파싱될 것으로 예상됨
    // 필요시 여기서 JSON.parse() 처리
    const licenseData = rows[0];
    return {
      success: true,
      data: {
        licenseSpdxId: licenseData.license_spdx_id,
        name: licenseData.name,
        descriptionSummaryHtml: licenseData.description_summary_html,
        permissions: licenseData.permissions_json || [], // DB가 JSON을 객체로 반환한다고 가정
        conditions: licenseData.conditions_json || [],
        limitations: licenseData.limitations_json || [],
      },
    };
  } catch (error) {
    console.error('라이선스 정보 조회 쿼리 오류:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  selectLicenseBySpdxId,
};

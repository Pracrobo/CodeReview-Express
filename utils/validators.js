/**
 * 요청 데이터 검증 유틸리티 모듈
 * Flask의 validators.py를 Express로 포팅
 */

// 설정값들 (Flask의 config.py에서 가져옴)
const CONFIG = {
  MAX_QUERY_LENGTH: 1000, // 최대 검색어 길이
  MAX_REPOSITORIES: 100, // 최대 저장소 개수 제한
  REQUEST_TIMEOUT: 300, // 요청 타임아웃 (초)
};

/**
 * 검증 오류 클래스
 */
class ValidationError extends Error {
  constructor(message, errorType = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.errorType = errorType;
  }
}

/**
 * 저장소 URL 유효성 검증
 * @param {string} repoUrl - 검증할 저장소 URL
 * @returns {string} - 정제된 저장소 URL
 * @throws {ValidationError} - 검증 실패 시
 */
function validateRepoUrl(repoUrl) {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new ValidationError('저장소 URL이 필요합니다.', 'MISSING_REPO_URL');
  }

  const trimmedUrl = repoUrl.trim();
  if (!trimmedUrl) {
    throw new ValidationError(
      '유효한 저장소 URL을 입력해주세요.',
      'EMPTY_REPO_URL'
    );
  }

  // GitHub URL 형식 검증
  const githubPattern =
    /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(\.git)?\/?$/;
  if (!githubPattern.test(trimmedUrl)) {
    throw new ValidationError(
      '유효한 GitHub URL 형식이 아닙니다. (예: https://github.com/owner/repo)',
      'INVALID_GITHUB_URL'
    );
  }

  return trimmedUrl;
}

/**
 * 저장소 이름 유효성 검증 (owner/repo 형식)
 * @param {string} repoName - 검증할 저장소 이름
 * @returns {string} - 정제된 저장소 이름
 * @throws {ValidationError} - 검증 실패 시
 */
function validateRepoName(repoName) {
  if (!repoName || typeof repoName !== 'string') {
    throw new ValidationError('저장소 이름이 필요합니다.', 'MISSING_REPO_NAME');
  }

  const trimmedName = repoName.trim();
  if (!trimmedName) {
    throw new ValidationError(
      '유효한 저장소 이름을 입력해주세요.',
      'EMPTY_REPO_NAME'
    );
  }

  // owner/repo 형식 검증
  const repoNamePattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
  if (!repoNamePattern.test(trimmedName)) {
    throw new ValidationError(
      '유효한 저장소 이름 형식이 아닙니다. (예: owner/repository)',
      'INVALID_REPO_NAME_FORMAT'
    );
  }

  if (trimmedName.startsWith('/') || trimmedName.endsWith('/')) {
    throw new ValidationError(
      "저장소 이름은 '/'로 시작하거나 끝날 수 없습니다.",
      'INVALID_REPO_NAME_SLASH'
    );
  }

  const slashCount = (trimmedName.match(/\//g) || []).length;
  if (slashCount !== 1) {
    throw new ValidationError(
      "저장소 이름은 하나의 '/'만 포함해야 합니다. (owner/repository)",
      'INVALID_REPO_NAME_SLASH_COUNT'
    );
  }

  return trimmedName;
}

/**
 * 검색 요청 데이터 유효성 검증
 * @param {Object} data - 검증할 검색 요청 데이터
 * @returns {Object} - 검증된 데이터 { repoName, query, searchType }
 * @throws {ValidationError} - 검증 실패 시
 */
function validateSearchRequest(data) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError(
      '요청 데이터가 필요합니다.',
      'MISSING_REQUEST_DATA'
    );
  }

  // repo_name 검증
  const repoName = validateRepoName(data.repo_name || data.repoName);

  // query 검증
  if (!data.query) {
    throw new ValidationError('검색어가 필요합니다.', 'MISSING_QUERY');
  }

  if (typeof data.query !== 'string') {
    throw new ValidationError(
      '검색어는 문자열이어야 합니다.',
      'INVALID_QUERY_TYPE'
    );
  }

  const query = data.query.trim();
  if (!query) {
    throw new ValidationError('유효한 검색어를 입력해주세요.', 'EMPTY_QUERY');
  }

  if (query.length > CONFIG.MAX_QUERY_LENGTH) {
    throw new ValidationError(
      `검색어는 ${CONFIG.MAX_QUERY_LENGTH}자를 초과할 수 없습니다.`,
      'QUERY_TOO_LONG'
    );
  }

  // search_type 검증
  let searchType = (data.search_type || data.searchType || 'code')
    .toString()
    .trim()
    .toLowerCase();

  if (!['code', 'document', 'doc'].includes(searchType)) {
    throw new ValidationError(
      "검색 타입은 'code' 또는 'document'여야 합니다.",
      'INVALID_SEARCH_TYPE'
    );
  }

  // 'doc'를 'document'로 정규화
  if (searchType === 'doc') {
    searchType = 'document';
  }

  return { repoName, query, searchType };
}

/**
 * GitHub 저장소 정보 검증
 * @param {Object} repoInfo - GitHub API에서 받은 저장소 정보
 * @throws {ValidationError} - 검증 실패 시
 */
function validateGitHubRepoInfo(repoInfo) {
  console.log('repoInfo', repoInfo);
  if (!repoInfo) {
    throw new ValidationError(
      '저장소 정보를 찾을 수 없습니다.',
      'REPOSITORY_NOT_FOUND'
    );
  }

  // 저장소가 비공개인지 확인
  if (repoInfo.private) {
    throw new ValidationError(
      '비공개 저장소는 분석할 수 없습니다. 공개 저장소만 지원됩니다.',
      'REPOSITORY_ACCESS_DENIED'
    );
  }

  // 저장소가 아카이브되었는지 확인
  if (repoInfo.archived) {
    throw new ValidationError(
      '아카이브된 저장소는 분석할 수 없습니다.',
      'REPOSITORY_ARCHIVED'
    );
  }

  // 저장소가 비활성화되었는지 확인
  if (repoInfo.disabled) {
    throw new ValidationError(
      '비활성화된 저장소는 분석할 수 없습니다.',
      'REPOSITORY_DISABLED'
    );
  }
}

/**
 * 언어 데이터 검증
 * @param {Object} languagesData - GitHub API에서 받은 언어 데이터
 * @param {string} repoUrl - 저장소 URL (오류 메시지용)
 * @throws {ValidationError} - 검증 실패 시
 */
function validateLanguagesData(languagesData, repoUrl = '') {
  if (!languagesData || typeof languagesData !== 'object') {
    return; // 언어 데이터가 없는 것은 허용 (빈 저장소 등)
  }

  // 언어 데이터가 있는지만 확인하고 크기 검증은 하지 않음
  const languages = Object.entries(languagesData);
  if (languages.length > 0) {
    console.log(
      `저장소 '${repoUrl}'의 언어 정보:`,
      languages.map(([lang, bytes]) => `${lang}: ${bytes} bytes`).join(', ')
    );
  }
}

/**
 * 분석 요청 데이터 종합 검증
 * @param {Object} data - 분석 요청 데이터
 * @returns {Object} - 검증된 데이터
 * @throws {ValidationError} - 검증 실패 시
 */
function validateAnalysisRequest(data) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError(
      '요청 데이터가 필요합니다.',
      'MISSING_REQUEST_DATA'
    );
  }

  const repoUrl = validateRepoUrl(data.repoUrl || data.repo_url);

  // 콜백 URL 검증 (선택적)
  if (data.callback_url || data.callbackUrl) {
    const callbackUrl = data.callback_url || data.callbackUrl;
    if (typeof callbackUrl !== 'string' || !callbackUrl.trim()) {
      throw new ValidationError(
        '유효한 콜백 URL을 입력해주세요.',
        'INVALID_CALLBACK_URL'
      );
    }

    // 기본적인 URL 형식 검증
    try {
      new URL(callbackUrl);
    } catch (error) {
      throw new ValidationError(
        '유효한 콜백 URL 형식이 아닙니다.',
        'INVALID_CALLBACK_URL'
      );
    }
  }

  return {
    repoUrl,
    callbackUrl: data.callback_url || data.callbackUrl,
    repositoryInfo: data.repository_info || data.repositoryInfo,
  };
}

export {
  ValidationError,
  validateRepoUrl,
  validateRepoName,
  validateSearchRequest,
  validateGitHubRepoInfo,
  validateLanguagesData,
  validateAnalysisRequest,
  CONFIG,
};

import axios from 'axios';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:3002';

// 저장소 인덱싱 요청 (Flask)
async function requestRepositoryIndexing(
  repoUrl,
  repositoryInfo,
  userId = null
) {
  try {
    const expressBaseUrl =
      process.env.EXPRESS_BASE_URL || 'http://localhost:3001';
    const callbackUrl = `${expressBaseUrl}/internal/analysis-complete`;

    const requestData = {
      repo_url: repoUrl,
      repository_info: repositoryInfo,
      callback_url: callbackUrl,
    };

    if (userId) {
      requestData.user_id = userId;
    }

    const response = await axios.post(
      `${FLASK_API_URL}/repository/index`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error('Flask 인덱싱 요청 오류:', error.message);

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || 'Flask 서버 오류',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'Flask 서버에 연결할 수 없습니다.',
        status: 503,
      };
    } else {
      return {
        success: false,
        error: `요청 설정 오류: ${error.message}`,
        status: 500,
      };
    }
  }
}

// 저장소 분석 상태 조회 (Flask)
async function getRepositoryAnalysisStatus(repoName) {
  try {
    const response = await axios.get(
      `${FLASK_API_URL}/repository/status/${repoName}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Flask 상태 조회 오류:', error.message);
    return {
      success: false,
      error: error.message,
      response: error.response,
    };
  }
}

// README 요약 요청 (Flask)
async function requestReadmeSummary(repoName, readmeContent) {
  try {
    console.log(`Flask에 README 요약 요청: ${repoName}`);

    const response = await axios.post(
      `${FLASK_API_URL}/repository/summarize-readme`,
      {
        repo_name: repoName,
        readme_content: readmeContent,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    if (response.data && response.data.status === 'success') {
      console.log(`README 요약 완료: ${repoName}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      console.error(`README 요약 실패: ${repoName}`, response.data);
      return {
        success: false,
        error: response.data?.message || 'README 요약 실패',
      };
    }
  } catch (error) {
    console.error(`README 요약 요청 오류: ${repoName}`, error.message);

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'README 요약 요청 시간이 초과되었습니다.',
      };
    }
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Flask 서버에 연결할 수 없습니다.',
      };
    }
    return {
      success: false,
      error: error.message || 'README 요약 요청 중 오류가 발생했습니다.',
    };
  }
}

// 코드/문서 검색 요청 (Flask)
async function searchRepository(repoName, query, searchType = 'code') {
  try {
    const response = await axios.post(
      `${FLASK_API_URL}/repository/search`,
      {
        repo_name: repoName,
        query: query,
        search_type: searchType,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error('Flask 검색 요청 오류:', error.message);

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || 'Flask 서버 오류',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'Flask 서버에 연결할 수 없습니다.',
        status: 503,
      };
    } else {
      return {
        success: false,
        error: `요청 설정 오류: ${error.message}`,
        status: 500,
      };
    }
  }
}

// 번역 요청 (Flask)
async function requestTranslation(
  text,
  sourceLanguage = 'auto',
  targetLanguage = 'ko'
) {
  try {
    console.log(`Flask에 번역 요청: ${text.length}자`);

    const response = await axios.post(
      `${FLASK_API_URL}/repository/translate`,
      {
        text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.status === 'success') {
      console.log(
        `번역 완료: ${text.length}자 -> ${response.data.data.translated_text.length}자`
      );
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      console.error('번역 실패:', response.data);
      return {
        success: false,
        error: response.data?.message || '번역 실패',
        originalText: text,
      };
    }
  } catch (error) {
    console.error('번역 요청 오류:', error.message);

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: '번역 요청 시간이 초과되었습니다.',
        originalText: text,
      };
    }
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Flask 서버에 연결할 수 없습니다.',
        originalText: text,
      };
    }
    return {
      success: false,
      error: error.message || '번역 요청 중 오류가 발생했습니다.',
      originalText: text,
    };
  }
}

// Flask 서버 헬스 체크
async function checkFlaskServerHealth() {
  try {
    const response = await axios.get(`${FLASK_API_URL}/`, {
      timeout: 5000,
    });

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Flask 서버에 연결할 수 없습니다.',
      status: error.response?.status || 503,
    };
  }
}

// AI 이슈 분석 요청 (Flask)
async function analyzeIssue(repoFullName, issueTitle, issueBody) {
  try {
    const response = await axios.post(
      `${FLASK_API_URL}/repository/analyze-issue`,
      {
        repo_name: repoFullName,
        issue_title: issueTitle,
        issue_body: issueBody,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );
    if (response.data && response.data.status === 'success') {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'AI 이슈 분석 실패',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'AI 이슈 분석 요청 중 오류',
    };
  }
}

export default {
  requestRepositoryIndexing,
  getRepositoryAnalysisStatus,
  requestReadmeSummary,
  searchRepository,
  requestTranslation,
  checkFlaskServerHealth,
  analyzeIssue,
};

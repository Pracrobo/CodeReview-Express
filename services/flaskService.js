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
        timeout: 300000, // 5분으로 증가
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
        timeout: 300000, // 5분으로 증가
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
        timeout: 300000, // 5분으로 증가
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
        timeout: 300000, // 5분으로 증가
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
        timeout: 300000, // 5분으로 증가
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
      timeout: 10000, // 10초로 증가
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

// 저장소 컨텍스트 기반 질문 답변 요청 (Flask)
async function askRepositoryQuestion(
  repoName,
  messages,
  readmeFilename = null,
  licenseFilename = null,
  contributingFilename = null
) {
  try {
    console.log(`Flask에 저장소 질문 요청: repo_name=${repoName}`);

    const requestData = {
      repo_name: repoName,
      messages: messages,
    };

    if (readmeFilename) {
      requestData.readme_filename = readmeFilename;
    }
    if (licenseFilename) {
      requestData.license_filename = licenseFilename;
    }
    if (contributingFilename) {
      requestData.contributing_filename = contributingFilename;
    }

    const response = await axios.post(
      `${FLASK_API_URL}/chatbot/ask-repository`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5분으로 증가
      }
    );

    if (response.data) {
      console.log(`저장소 질문 답변 완료: repo_name=${repoName}`);
      return {
        success: true,
        data: response.data,
      };
    } else {
      console.error(
        `저장소 질문 답변 실패: repo_name=${repoName}`,
        response.data
      );
      return {
        success: false,
        error: '답변 생성에 실패했습니다.',
      };
    }
  } catch (error) {
    console.error(
      `저장소 질문 답변 요청 오류: repo_name=${repoName}`,
      error.message
    );

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: '답변 생성 시간이 초과되었습니다.',
      };
    }
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Flask 서버에 연결할 수 없습니다.',
      };
    }
    if (error.response?.status === 404) {
      return {
        success: false,
        error: '저장소 또는 파일을 찾을 수 없습니다.',
      };
    }
    return {
      success: false,
      error: error.message || '질문 답변 요청 중 오류가 발생했습니다.',
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
  askRepositoryQuestion, // 업데이트된 함수
};

import axios from 'axios';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:3002';

const flaskService = {
  // Flask 서버에 저장소 인덱싱 요청
  async requestRepositoryIndexing(repoUrl, repositoryInfo, userId = null) {
    try {
      // Express 서버의 콜백 URL 구성
      const expressBaseUrl =
        process.env.EXPRESS_BASE_URL || 'http://localhost:3001';
      const callbackUrl = `${expressBaseUrl}/internal/analysis-complete`;

      const requestData = {
        repo_url: repoUrl,
        repository_info: repositoryInfo, // 추가 정보 전달
        callback_url: callbackUrl, // 콜백 URL 추가
      };

      // 사용자 ID가 있으면 추가
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
          timeout: 30000, // 30초 타임아웃
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
        // Flask 서버에서 응답을 받았지만 오류 상태
        return {
          success: false,
          error: error.response.data?.message || 'Flask 서버 오류',
          status: error.response.status,
          data: error.response.data,
        };
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못함
        return {
          success: false,
          error: 'Flask 서버에 연결할 수 없습니다.',
          status: 503,
        };
      } else {
        // 요청 설정 중 오류
        return {
          success: false,
          error: `요청 설정 오류: ${error.message}`,
          status: 500,
        };
      }
    }
  },

  // Flask 서버에서 저장소 분석 상태 조회
  async getRepositoryAnalysisStatus(repoName) {
    try {
      const response = await axios.get(
        `${FLASK_API_URL}/repository/status/${repoName}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10초 타임아웃
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
  },

  // Flask 서버에 README 요약 요청
  async requestReadmeSummary(repoName, readmeContent) {
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
          timeout: 60000, // 60초 타임아웃 (AI 처리 시간 고려)
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

      // 타임아웃 오류 처리
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'README 요약 요청 시간이 초과되었습니다.',
        };
      }

      // Flask 서버 연결 오류 처리
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
  },

  // Flask 서버에서 저장소 검색
  async searchRepository(repoName, query, searchType = 'code') {
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
          timeout: 60000, // 60초 타임아웃 (검색은 시간이 걸릴 수 있음)
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
  },

  // Flask 서버에 텍스트 번역 요청
  async requestTranslation(
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
          timeout: 30000, // 30초 타임아웃
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
          originalText: text, // 실패 시 원본 텍스트 반환
        };
      }
    } catch (error) {
      console.error('번역 요청 오류:', error.message);

      // 타임아웃 오류 처리
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: '번역 요청 시간이 초과되었습니다.',
          originalText: text,
        };
      }

      // Flask 서버 연결 오류 처리
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
  },

  // Flask 서버 상태 확인
  async checkFlaskServerHealth() {
    try {
      const response = await axios.get(`${FLASK_API_URL}/`, {
        timeout: 5000, // 5초 타임아웃
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
  },
};

export default flaskService;

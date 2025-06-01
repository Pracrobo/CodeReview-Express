import axios from 'axios';
import querystring from 'querystring';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

export const githubApiService = {
  // GitHub OAuth 코드로 액세스 토큰 요청
  async getAccessToken(code) {
    try {
      const response = await axios.post(
        `${GITHUB_OAUTH_URL}/access_token`,
        querystring.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.data.access_token) {
        throw new Error('GitHub에서 access_token을 받지 못했습니다.');
      }

      return response.data.access_token;
    } catch (error) {
      throw new Error(`GitHub 액세스 토큰 요청 실패: ${error.message}`);
    }
  },

  // 액세스 토큰으로 사용자 정보 조회
  async getUserInfo(githubAccessToken) {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/user`, {
        headers: { Authorization: `token ${githubAccessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`GitHub 사용자 정보 조회 실패: ${error.message}`);
    }
  },

  // 액세스 토큰으로 사용자 이메일 목록 조회
  async getUserEmails(githubAccessToken) {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/user/emails`, {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`GitHub 이메일 정보 조회 실패: ${error.message}`);
    }
  },

  // GitHub 애플리케이션 연동 해제 (grant 엔드포인트 사용)
  async unlinkGithub(githubAccessToken) {
    try {
      // 실제 구현 필요
    } catch (error) {
      throw new Error(`GitHub 연동 해제 실패: ${error.message}`);
    }
  },

  // GitHub 로그아웃 (token 엔드포인트 사용)
  async logoutGithub(githubAccessToken) {
    try {
      // 실제 구현 필요
    } catch (error) {
      throw new Error(`GitHub 로그아웃 실패: ${error.message}`);
    }
  },
};

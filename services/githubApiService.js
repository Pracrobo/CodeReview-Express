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
        throw new Error('GitHub에서 액세스 토큰을 받지 못했습니다.');
      }

      return response.data.access_token;
    } catch (error) {
      throw new Error(`GitHub 액세스 토큰 요청 실패: ${error.message}`);
    }
  },

  // 액세스 토큰으로 사용자 정보 조회
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/user`, {
        headers: { Authorization: `token ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`GitHub 사용자 정보 조회 실패: ${error.message}`);
    }
  },

  // 액세스 토큰으로 사용자 이메일 목록 조회
  async getUserEmails(accessToken) {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/user/emails`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`GitHub 이메일 정보 조회 실패: ${error.message}`);
    }
  },

  // ===== 새로 추가: 저장소 정보 조회 =====

  // GitHub 저장소 정보 조회
  async getRepositoryInfo(repoUrl, accessToken = null) {
    try {
      // URL에서 owner/repo 추출
      const urlParts = repoUrl.replace('https://github.com/', '').split('/');
      if (urlParts.length < 2) {
        throw new Error('유효하지 않은 GitHub URL입니다.');
      }

      const owner = urlParts[0];
      const repo = urlParts[1].replace('.git', '');

      const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      // 액세스 토큰이 있으면 추가 (rate limit 향상)
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}`,
        { headers }
      );

      const repoData = response.data;

      return {
        githubRepoId: repoData.id,
        fullName: repoData.full_name,
        name: repoData.name,
        description: repoData.description,
        htmlUrl: repoData.html_url,
        programmingLanguage: repoData.language,
        licenseSpdxId: repoData.license?.spdx_id || null,
        star: repoData.stargazers_count,
        fork: repoData.forks_count,
        isPrivate: repoData.private,
        defaultBranch: repoData.default_branch,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        pushedAt: repoData.pushed_at,
        size: repoData.size, // KB 단위
        openIssuesCount: repoData.open_issues_count,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('저장소를 찾을 수 없습니다. URL을 확인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('저장소에 접근할 권한이 없습니다.');
      } else if (error.response?.status === 401) {
        throw new Error('GitHub 인증이 필요합니다.');
      }
      throw new Error(`GitHub 저장소 정보 조회 실패: ${error.message}`);
    }
  },

  // GitHub 저장소 언어 정보 조회
  async getRepositoryLanguages(repoUrl, accessToken = null) {
    try {
      const urlParts = repoUrl.replace('https://github.com/', '').split('/');
      if (urlParts.length < 2) {
        throw new Error('유효하지 않은 GitHub URL입니다.');
      }

      const owner = urlParts[0];
      const repo = urlParts[1].replace('.git', '');

      const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/languages`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.warn(`언어 정보 조회 실패: ${error.message}`);
      return {};
    }
  },

  // GitHub 애플리케이션 연동 해제 (grant 엔드포인트 사용)
  async unlinkGithub(accessToken) {
    try {
      const basicAuth = Buffer.from(
        `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`
      ).toString('base64');

      await axios.delete(
        `${GITHUB_API_URL}/applications/${process.env.GITHUB_CLIENT_ID}/grant`,
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            Accept: 'application/vnd.github+json',
          },
          data: { access_token: accessToken },
        }
      );
    } catch (error) {
      throw new Error(`GitHub 연동 해제 실패: ${error.message}`);
    }
  },

  // GitHub 로그아웃 (token 엔드포인트 사용)
  async logoutGithub(accessToken) {
    try {
      const basicAuth = Buffer.from(
        `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`
      ).toString('base64');

      await axios.delete(
        `${GITHUB_API_URL}/applications/${process.env.GITHUB_CLIENT_ID}/token`,
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            Accept: 'application/vnd.github+json',
          },
          data: { access_token: accessToken },
        }
      );
    } catch (error) {
      throw new Error(`GitHub 로그아웃 실패: ${error.message}`);
    }
  },
};

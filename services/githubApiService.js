import axios from 'axios';
import querystring from 'querystring';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

// GitHub Basic 인증 헤더 생성 (내부용)
function getBasicAuthHeader() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  );
  return `Basic ${credentials}`;
}

// GitHub 저장소 URL 파싱 (내부용)
function parseRepositoryUrl(repoUrl) {
  try {
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    if (urlParts.length < 2) {
      throw new Error('유효하지 않은 GitHub URL입니다.');
    }
    const owner = urlParts[0];
    const repo = urlParts[1].replace('.git', '');
    if (!owner || !repo) {
      throw new Error('유효하지 않은 GitHub URL입니다.');
    }
    return { owner, repo };
  } catch (error) {
    throw new Error('유효하지 않은 GitHub URL입니다.');
  }
}

// GitHub OAuth 인증 코드로 액세스 토큰 발급
async function getAccessToken(code) {
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
}

// GitHub 사용자 정보 조회
async function getUserInfo(githubAccessToken) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user`, {
      headers: { Authorization: `token ${githubAccessToken}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(`GitHub 사용자 정보 조회 실패: ${error.message}`);
  }
}

// GitHub 사용자 이메일 목록 조회
async function getUserEmails(githubAccessToken) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/emails`, {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(`GitHub 이메일 정보 조회 실패: ${error.message}`);
  }
}

// 저장소 정보 조회
async function getRepositoryInfo(repoUrl, accessToken = null) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
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
      size: repoData.size,
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
}

// 저장소 언어 정보 조회
async function getRepositoryLanguages(repoUrl, accessToken = null) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
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
}

// 저장소 README 조회
async function getRepositoryReadme(repoUrl, accessToken = null) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/readme`,
      { headers }
    );
    const content = Buffer.from(response.data.content, 'base64').toString(
      'utf-8'
    );
    return {
      content: content,
      name: response.data.name,
      path: response.data.path,
      sha: response.data.sha,
      size: response.data.size,
      url: response.data.url,
      htmlUrl: response.data.html_url,
      downloadUrl: response.data.download_url,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`README 파일을 찾을 수 없습니다: ${repoUrl}`);
      return null;
    }
    console.warn(`README 조회 실패: ${error.message}`);
    return null;
  }
}

// 저장소 라이선스 정보 조회
async function getRepositoryLicense(repoUrl, accessToken = null) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/license`,
      { headers }
    );
    const content = response.data.content
      ? Buffer.from(response.data.content, 'base64').toString('utf-8')
      : null;
    return {
      name: response.data.name,
      path: response.data.path,
      sha: response.data.sha,
      size: response.data.size,
      url: response.data.url,
      htmlUrl: response.data.html_url,
      downloadUrl: response.data.download_url,
      content: content,
      license: {
        key: response.data.license?.key,
        name: response.data.license?.name,
        spdxId: response.data.license?.spdx_id,
        url: response.data.license?.url,
        nodeId: response.data.license?.node_id,
      },
    };
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`라이선스 파일을 찾을 수 없습니다: ${repoUrl}`);
      return null;
    }
    console.warn(`라이선스 조회 실패: ${error.message}`);
    return null;
  }
}

// GitHub 연동 해제
async function unlinkGithub(githubAccessToken) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const response = await axios.delete(
      `${GITHUB_API_URL}/applications/${clientId}/grant`,
      {
        data: { access_token: githubAccessToken },
        headers: {
          Authorization: getBasicAuthHeader(),
          Accept: 'application/vnd.github+json',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `GitHub 연동 해제 실패: ${error.response?.data?.message || error.message}`
    );
  }
}

// GitHub 로그아웃
async function logoutGithub(githubAccessToken) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const response = await axios.delete(
      `${GITHUB_API_URL}/applications/${clientId}/token`,
      {
        data: { access_token: githubAccessToken },
        headers: {
          Authorization: getBasicAuthHeader(),
          Accept: 'application/vnd.github+json',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `GitHub 로그아웃 실패: ${error.response?.data?.message || error.message}`
    );
  }
}

// 저장소 open 이슈 목록 조회
async function getOpenIssues(repoUrl, accessToken = null) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    // open 상태만, PR 제외
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/issues?state=open&per_page=100`,
      { headers }
    );
    // PR이 아닌 이슈만 필터링
    return response.data.filter((issue) => !issue.pull_request);
  } catch (error) {
    console.warn(`open 이슈 목록 조회 실패: ${error.message}`);
    return [];
  }
}

export default {
  getAccessToken,
  getUserInfo,
  getUserEmails,
  getRepositoryInfo,
  getRepositoryLanguages,
  getRepositoryReadme,
  getRepositoryLicense,
  unlinkGithub,
  logoutGithub,
  getOpenIssues,
};

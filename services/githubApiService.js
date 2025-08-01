import axios from 'axios';
import querystring from 'querystring';
import { Octokit } from '@octokit/rest';
import Bottleneck from 'bottleneck';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

// GitHub API 속도 제한을 위한 Bottleneck 설정
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 100, // 최소 100ms 간격
});

// 인증 헤더 생성 (사용자 토큰 필수)
function getAuthHeaders(userToken) {
  if (!userToken) {
    throw new Error('GitHub 토큰이 필요합니다. 로그인이 필요합니다.');
  }

  return {
    Authorization: `Bearer ${userToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Octokit 인스턴스 생성 함수 (사용자 토큰 필수)
function getOctokit(accessToken) {
  if (!accessToken) {
    throw new Error('GitHub 액세스 토큰이 필요합니다. 로그인해주세요.');
  }
  return new Octokit({
    auth: accessToken,
    request: {
      fetch: async (url, options) => {
        return limiter.schedule(() => fetch(url, options));
      },
    },
  });
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

// 저장소 정보 조회 (사용자 토큰 필수)
async function getRepositoryInfo(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const octokit = getOctokit(accessToken);

    console.log(`GitHub 저장소 정보 조회: ${owner}/${repo}`);

    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    });

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
    console.error(`저장소 정보 조회 실패: ${error}`);

    if (error.response?.data) {
      console.error('GitHub API 응답:', error.response.data);
    }

    if (error.status === 404) {
      throw new Error('저장소를 찾을 수 없습니다. URL을 확인해주세요.');
    } else if (error.status === 403) {
      const rateLimitRemaining =
        error.response?.headers?.['x-ratelimit-remaining'];
      const rateLimitReset = error.response?.headers?.['x-ratelimit-reset'];

      if (rateLimitRemaining === '0') {
        const resetTime = rateLimitReset
          ? new Date(rateLimitReset * 1000).toLocaleString()
          : '알 수 없음';
        throw new Error(
          `GitHub API 사용량 한도에 도달했습니다. 재설정 시간: ${resetTime}`
        );
      } else {
        throw new Error('저장소에 접근할 권한이 없습니다.');
      }
    } else if (error.status === 401) {
      throw new Error('GitHub 인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    throw new Error(`GitHub 저장소 정보 조회 실패: ${error.message}`);
  }
}

// 시스템 토큰으로 저장소 정보 조회 (내부 API용)
async function getRepositoryInfoInternal(repoUrl) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    // 환경변수에서 시스템 토큰 사용
    const systemToken =
      process.env.GITHUB_SYSTEM_TOKEN || process.env.GITHUB_API_TOKEN;

    console.log(`시스템 토큰으로 GitHub 저장소 정보 조회: ${owner}/${repo}`);

    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (systemToken) {
      headers['Authorization'] = `Bearer ${systemToken}`;
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
    console.error(`시스템 토큰으로 저장소 정보 조회 실패: ${error}`);

    if (error.response?.status === 404) {
      throw new Error('저장소를 찾을 수 없습니다. URL을 확인해주세요.');
    } else if (error.response?.status === 403) {
      // 공개 저장소의 경우 토큰 없이 기본 정보 반환
      console.warn('시스템 토큰 권한 부족, 공개 API로 재시도');

      try {
        const publicResponse = await axios.get(
          `${GITHUB_API_URL}/repos/${owner}/${repo}`
        );
        const publicData = publicResponse.data;

        return {
          githubRepoId: publicData.id,
          fullName: publicData.full_name,
          name: publicData.name,
          description: publicData.description,
          htmlUrl: publicData.html_url,
          programmingLanguage: publicData.language,
          licenseSpdxId: publicData.license?.spdx_id || null,
          star: publicData.stargazers_count,
          fork: publicData.forks_count,
          isPrivate: publicData.private,
          defaultBranch: publicData.default_branch,
          createdAt: publicData.created_at,
          updatedAt: publicData.updated_at,
          pushedAt: publicData.pushed_at,
          size: publicData.size,
          openIssuesCount: publicData.open_issues_count,
        };
      } catch (publicError) {
        throw new Error('저장소에 접근할 권한이 없습니다.');
      }
    }
    throw new Error(`GitHub 저장소 정보 조회 실패: ${error.message}`);
  }
}

// 저장소 언어 정보 조회 (사용자 토큰 필수)
async function getRepositoryLanguages(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const headers = getAuthHeaders(accessToken);

    console.log(`GitHub 언어 정보 조회: ${owner}/${repo}`);

    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/languages`,
      { headers: { Accept: 'application/vnd.github+json', ...headers } }
    );
    return response.data;
  } catch (error) {
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    console.warn(`언어 정보 조회 실패: ${error.message}`);
    return {};
  }
}

// 시스템 토큰으로 언어 정보 조회 (내부 API용)
async function getRepositoryLanguagesInternal(repoUrl) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const systemToken =
      process.env.GITHUB_SYSTEM_TOKEN || process.env.GITHUB_API_TOKEN;

    console.log(`시스템 토큰으로 GitHub 언어 정보 조회: ${owner}/${repo}`);

    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (systemToken) {
      headers['Authorization'] = `Bearer ${systemToken}`;
    }

    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/languages`,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.warn(`시스템 토큰으로 언어 정보 조회 실패: ${error.message}`);
    return {};
  }
}

// 저장소 README 조회 (사용자 토큰 필수)
async function getRepositoryReadme(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const headers = getAuthHeaders(accessToken);

    console.log(`GitHub README 조회: ${owner}/${repo}`);

    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/readme`,
      { headers: { Accept: 'application/vnd.github+json', ...headers } }
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
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    if (error.response?.status === 404) {
      console.warn(`README 파일을 찾을 수 없습니다: ${repoUrl}`);
      return null;
    }
    console.warn(`README 조회 실패: ${error.message}`);
    return null;
  }
}

// 저장소 라이선스 정보 조회 (사용자 토큰 필수)
async function getRepositoryLicense(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const headers = getAuthHeaders(accessToken);

    console.log(`GitHub 라이선스 조회: ${owner}/${repo}`);

    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/license`,
      { headers: { Accept: 'application/vnd.github+json', ...headers } }
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
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    if (error.response?.status === 404) {
      console.warn(`라이선스 파일을 찾을 수 없습니다: ${repoUrl}`);
      return null;
    }
    console.warn(`라이선스 조회 실패: ${error.message}`);
    return null;
  }
}

// 시스템 토큰으로 라이선스 정보 조회 (내부 API용)
async function getRepositoryLicenseInternal(repoUrl) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const systemToken =
      process.env.GITHUB_SYSTEM_TOKEN || process.env.GITHUB_API_TOKEN;

    console.log(`시스템 토큰으로 GitHub 라이선스 조회: ${owner}/${repo}`);

    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (systemToken) {
      headers['Authorization'] = `Bearer ${systemToken}`;
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
    console.warn(`시스템 토큰으로 라이선스 조회 실패: ${error.message}`);
    return null;
  }
}

// 기본 인증 헤더 생성 (GitHub 앱 인증용)
function getBasicAuthHeader() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  );
  return `Basic ${credentials}`;
}

// GitHub 연동 해제
async function unlinkGithub(githubAccessToken) {
  try {
    if (!githubAccessToken) {
      throw new Error('GitHub 액세스 토큰이 필요합니다.');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    console.log(`GitHub 연동 해제 시도: ${clientId}`);

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

    console.log('GitHub 연동 해제 성공');
    return response.data;
  } catch (error) {
    console.error(
      'GitHub 연동 해제 실패:',
      error.response?.data || error.message
    );
    throw new Error(
      `GitHub 연동 해제 실패: ${error.response?.data?.message || error.message}`
    );
  }
}

// GitHub 로그아웃
async function logoutGithub(githubAccessToken) {
  try {
    if (!githubAccessToken) {
      console.warn('GitHub 액세스 토큰이 없어 GitHub 로그아웃을 건너뜁니다.');
      return null;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    console.log(`GitHub 로그아웃 시도: ${clientId}`);

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

    console.log('GitHub 로그아웃 성공');
    return response.data;
  } catch (error) {
    console.error(
      'GitHub 로그아웃 실패:',
      error.response?.data || error.message
    );
    // 로그아웃 실패는 치명적이지 않으므로 경고만 로그
    console.warn('GitHub 로그아웃에 실패했지만 계속 진행합니다.');
    return null;
  }
}

// 저장소 open 이슈 목록 조회 (사용자 토큰 필수)
async function getOpenIssues(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const headers = getAuthHeaders(accessToken);

    console.log(`GitHub 이슈 목록 조회: ${owner}/${repo}`);

    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/issues?state=open&per_page=100`,
      { headers: { Accept: 'application/vnd.github+json', ...headers } }
    );
    return response.data.filter((issue) => !issue.pull_request);
  } catch (error) {
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    console.warn(`open 이슈 목록 조회 실패: ${error.message}`);
    return [];
  }
}

// 저장소의 README 파일명 감지 (사용자 토큰 필수)
async function detectReadmeFilename(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const octokit = getOctokit(accessToken);

    console.log(`README 파일명 감지: ${owner}/${repo}`);

    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path: '',
    });

    const readmeFile = contents.find(
      (file) =>
        file.type === 'file' && /^readme(\.(md|rst|txt))?$/i.test(file.name)
    );

    return readmeFile ? readmeFile.name : 'README.md';
  } catch (error) {
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    console.warn(`README 파일명 감지 실패: ${error.message}`);
    return 'README.md';
  }
}

// 저장소의 LICENSE 파일명 감지 (사용자 토큰 필수)
async function detectLicenseFilename(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const octokit = getOctokit(accessToken);

    console.log(`LICENSE 파일명 감지: ${owner}/${repo}`);

    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path: '',
    });

    const licenseFile = contents.find(
      (file) =>
        file.type === 'file' && /^licen[cs]e(\.(md|txt))?$/i.test(file.name)
    );

    return licenseFile ? licenseFile.name : 'LICENSE';
  } catch (error) {
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    console.warn(`LICENSE 파일명 감지 실패: ${error.message}`);
    return 'LICENSE';
  }
}

// 저장소의 CONTRIBUTING 파일명 감지 (사용자 토큰 필수)
async function detectContributingFilename(repoUrl, accessToken) {
  try {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const octokit = getOctokit(accessToken);

    console.log(`CONTRIBUTING 파일명 감지: ${owner}/${repo}`);

    try {
      const { data: contents } = await octokit.repos.getContent({
        owner,
        repo,
        path: '',
      });

      const contributingFile = contents.find(
        (file) => file.type === 'file' && /^contribut/i.test(file.name)
      );

      if (contributingFile) {
        return contributingFile.name;
      }
    } catch (error) {
      console.warn(`루트 디렉토리 조회 실패: ${error.message}`);
    }

    try {
      const { data: rootContents } = await octokit.repos.getContent({
        owner,
        repo,
        path: '',
      });

      const directories = rootContents.filter((item) => item.type === 'dir');

      for (const dir of directories) {
        try {
          const { data: dirContents } = await octokit.repos.getContent({
            owner,
            repo,
            path: dir.name,
          });

          const contributingFile = dirContents.find(
            (file) => file.type === 'file' && /^contribut/i.test(file.name)
          );

          if (contributingFile) {
            return `${dir.name}/${contributingFile.name}`;
          }
        } catch (dirError) {
          console.warn(`${dir.name} 디렉토리 조회 실패: ${dirError.message}`);
        }
      }
    } catch (error) {
      console.warn(`하위 디렉토리 검색 실패: ${error.message}`);
    }

    return null;
  } catch (error) {
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    console.warn(`CONTRIBUTING 파일명 감지 중 오류: ${error.message}`);
    throw error;
  }
}

// 이슈 댓글 조회 (사용자 토큰 필수)
async function getIssueComments(repoFullName, githubIssueNumber, accessToken) {
  try {
    if (!accessToken) {
      throw new Error('GitHub 토큰이 필요합니다. 로그인해주세요.');
    }

    const url = `https://api.github.com/repos/${repoFullName}/issues/${githubIssueNumber}/comments`;
    const headers = getAuthHeaders(accessToken);

    console.log(`GitHub 이슈 댓글 조회: ${repoFullName}#${githubIssueNumber}`);

    const res = await axios.get(url, {
      headers: { Accept: 'application/vnd.github+json', ...headers },
    });
    return res.data;
  } catch (error) {
    if (error.message.includes('GitHub 토큰이 필요합니다')) {
      throw error;
    }
    console.error('GitHub 이슈 댓글 조회 오류:', error.message);
    return [];
  }
}

export default {
  getAccessToken,
  getUserInfo,
  getUserEmails,
  getRepositoryInfo,
  getRepositoryInfoInternal, // 새로 추가된 함수
  getRepositoryLanguages,
  getRepositoryLanguagesInternal, // 새로 추가된 함수
  getRepositoryReadme,
  getRepositoryLicense,
  getRepositoryLicenseInternal, // 새로 추가된 함수
  unlinkGithub,
  logoutGithub,
  getOpenIssues,
  detectReadmeFilename,
  detectLicenseFilename,
  detectContributingFilename,
  getIssueComments,
};

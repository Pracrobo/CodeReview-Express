import axios from 'axios';
import querystring from 'querystring';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

const githubService = {
  getAccessToken: async (code) => {
    const response = await axios.post(`${GITHUB_OAUTH_URL}/access_token`, querystring.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }), {
      headers: {
        'Accept': 'application/json',
      },
    });
    return response.data.access_token;
  },

  getUserInfo: async (accessToken) => {
    const response = await axios.get(`${GITHUB_API_URL}/user`, {
      headers: {
        'Authorization': `token ${accessToken}`,
      },
    });
    return response.data;
  }
};

export { githubService };
import axios from 'axios';
import querystring from 'querystring';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

export const githubService = {
  async getAccessToken(code) {
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

  async getUserInfo(accessToken) {
    const response = await axios.get(`${GITHUB_API_URL}/user`, {
      headers: {
        'Authorization': `token ${accessToken}`,
      },
    });
    return response.data;
  },

  async getUserEmails(accessToken) {
    const res = await axios.get(`${GITHUB_API_URL}/user/emails`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
    });
    return res.data;
  },

  async revokeAccessToken(accessToken) {
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
        data: {
          access_token: accessToken,
        },
      }
    );
  },
};
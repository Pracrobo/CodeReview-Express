import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import dotenv from 'dotenv';
dotenv.config();

console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET);
console.log('GITHUB_REDIRECT_URI:', process.env.GITHUB_REDIRECT_URI);

// User 모델은 실제 DB 사용 시 구현 필요

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_REDIRECT_URI
  },
  async (accessToken, refreshToken, profile, done) => {
    // 임시: 사용자 객체 반환
    const user = {
      githubId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      profileImage: profile._json.avatar_url,
    };
    done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user.githubId);
});

passport.deserializeUser((id, done) => {
  // 임시: 사용자 객체 반환
  done(null, { githubId: id });
});

export default passport;
import express from 'express';
import session from 'express-session';
import passport from 'passport';
//mport authRoutes from './routes/auth.js';
import dotenv from 'dotenv';

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true,
// }));

// app.use(passport.initialize());
// app.use(passport.session());

//app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the GitHub OAuth Authentication App');
});

// GitHub 저장소 검색 (공개 및 사용자 권한 저장소)
app.get('/repositories/search', (req, res) => {
  
});

// 내 저장소 목록 조회
app.get('/repositories/tracked', (req, res) => {

});

//'내 저장소'에 특정 저장소 추가
app.post('/repositories/tracked',(req, res) => {

});

//'내 저장소'에서 특정 저장소 삭제
app.delete('/repositories/tracked/{github_repo_id}',(req, res) => {

});

//'특정 저장소 개요 정보 조회
app.get('/repositories/{github_repo_id}/overview', (req, res) => {
  
});

//특정 저장소 이슈 목록 및 AI 분석 결과 조회
app.get('/repositories/{github_repo_id}/issues', (req, res) => {
  
});


//특정 저장소 코드 컨벤션 문서 조회
app.get('/repositories/{github_repo_id}/convention', (req, res) => {
  
});

//특정 이슈 상세 분석 정보 및 원본 내용 조회
app.get('/repositories/{github_repo_id}/issues/{github_issue_number}', (req, res) => {
  
});


//특정 이슈를 '해결 목록'에 수동 추가
app.post('/users/me/solved-issues', (req, res) => {
    
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
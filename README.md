# CodeReview (Express)

CodeReview는 GitHub 이슈를 AI로 분석하여 자동으로 해결책을 제안하는 시스템입니다.  
이 저장소는 Node.js(Express) 기반의 백엔드 서버를 제공합니다.

## 실행 방법

```bash
npm install
npm run dev
```

- 환경 변수 설정이 필요한 경우 `.env` 파일을 프로젝트 루트에 추가하세요.

## 테스트 방법

- Postman, curl 등으로 API 엔드포인트를 호출하여 테스트할 수 있습니다.

## 주요 기능

- [CodeReview-React](https://github.com/Pracrobo/CodeReview-React)와 RESTful API 연동
- [CodeReview-Flask](https://github.com/Prarobo/CodeReview-Flask)와 RESTful API 연동

- GitHub API 연동
- 인증, 인가 JWT
- 결제 서비스(토스페이먼츠)와 RESTful API 연동
- 이메일 알림
- 브라우저 알림

## 기술 스택

- Node.js
- Express
- Gemini LLM API 연동
- 기타: dotenv, cors 등

## 프로젝트 구조

```
src/
├── controllers/   # 컨트롤러
├── database/      # 데이터베이스 세팅 및 DDL, DML sql
├── middlewares/   # 인증인가, 에러 관련 모듈
├── models/        # 데이터베이스 연결 관련 모듈
├── routes/        # 라우터
├── services/      # 서비스
├── utils/         # 유틸리티 함수
└── app.js         # 서버 진입점
```

## 기여 방법

1. 이슈 또는 PR 등록 전, 반드시 최신 브랜치로 업데이트
2. 코드 스타일은 프로젝트 내 기존 스타일을 따릅니다.
3. 자세한 방법은 CONTIRIBUTING.md 파일을 읽고 따릅니다

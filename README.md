# AIssue Backend (Express)

AIssue는 GitHub 이슈를 AI로 분석하여 자동으로 해결책을 제안하는 시스템입니다.  
이 저장소는 Node.js(Express) 기반의 백엔드 서버를 제공합니다.

## 🚀 실행 방법

```bash
npm install
npm run dev
```

- 환경 변수 설정이 필요한 경우 `.env` 파일을 프로젝트 루트에 추가하세요.

## 🧪 테스트 방법

- Postman, curl 등으로 API 엔드포인트를 호출하여 테스트할 수 있습니다.
- `/docs` 경로에서 Swagger 문서가 제공된다면 웹 브라우저로 확인 가능합니다.

## 📋 주요 기능

- GitHub 이슈 분석 및 요약
- AI 기반 코드 추천 및 수정안 제안
- 프로젝트 README 및 구조 요약
- RESTful API 제공

## 🛠️ 기술 스택

- Node.js
- Express
- TypeScript (선택적)
- OpenAI API 또는 유사 LLM API 연동
- 기타: dotenv, cors 등

## 📁 프로젝트 구조

```
src/
├── api/           # 라우터 및 컨트롤러
├── services/      # 비즈니스 로직
├── core/          # 프롬프트 및 AI 관련 모듈
├── utils/         # 유틸리티 함수
└── index.js       # 서버 진입점
```

## 🤝 기여 방법

1. 이슈 또는 PR 등록 전, 반드시 최신 브랜치로 업데이트 해주세요.
2. 새로운 프롬프트나 기능 추가 시 `src/core/prompts.ts`에 템플릿을 정의하고, 관련 라우터/서비스에 연결하세요.
3. 코드 스타일은 프로젝트 내 기존 스타일을 따릅니다.

## 📝 라이선스

이 프로젝트의 모든 저작권은 팀 Mai-Nova가 가지고 있습니다.

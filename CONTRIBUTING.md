# ‘AIssue-BE-Express’ 프로젝트 기여 방법 (Contribution Guidelines)

이 문서는 'AIssue-BE-Express' 프로젝트에 기여하는 데 필요한 프로세스를 안내합니다. 여러분의 참여에 감사드립니다!

## 사전 확인 (Precheck Steps)

프로젝트에 기여하기 전에 몇 가지 중요한 사항을 확인해주세요.

1. 이슈 먼저 남기기: 작업을 시작하기 전에 먼저 이슈를 생성해주세요.
   어떤 작업을 할지 다른 기여자들에게 알리는 데 도움이 됩니다.
   제안하는 문제가 이 저장소의 방향과 맞지 않을 수도 있습니다.
2. 현재 코드베이스를 유지하는 것이 우리의 의도일 수도 있습니다. (KISS 원칙: Keep It Simple, Stupid)
3. Git 사용법 숙지: Git 사용법을 이해하고 있어야 합니다.
   만약 Git에 익숙하지 않다면, "Git 사용 방법"을 검색하여 기본적인 내용을 학습하는 것을 권장합니다. 개발자로서 필수적인 기술입니다.
   Git tutorial을 참고할 수 있습니다.
   기여 가이드라인 (Contribution Guidelines)

자 이제 기여 해보러 갈까요?

### Step 1: 저장소 Fork (Fork the Repository)

GitHub에서 'Fork' 버튼을 눌러 프로젝트를 여러분의 계정으로 Fork하세요. 이 과정은 여러분의 개인 저장소에 프로젝트 복사본을 생성하여 작업을 시작할 수 있도록 합니다.

### Step 2: 로컬 컴퓨터에 클론 (Clone to Your Local Computer)

Fork한 저장소를 로컬 컴퓨터로 다운로드합니다. YOUR_GITHUB_NAME을 여러분의 GitHub 사용자 이름으로 변경해야 합니다.

```Bash
git clone https://github.com/YOUR_GITHUB_NAME/AIssue-BE-Express.git
cd AIssue-BE-Express
```

### Step 3: Upstream 설정 (Setup an Upstream)

원본 저장소(AIssue-BE-Express)와의 연결을 설정하여, 나중에 변경 사항을 쉽게 동기화할 수 있도록 합니다.

```Bash
git remote add upstream https://github.com/Mai-Nova/AIssue-BE-Express.git
```

원본 저장소에 업데이트가 있을 경우, 로컬 복사본과 여러분의 GitHub 저장소를 최신 상태로 유지할 수 있습니다.

```Bash
git pull upstream master && git push origin master
```

### Step 4: 새 브랜치 생성 (Make a Branch)

main 브랜치는 Pull Request들이 계속 병합되고 수정되기 때문에, main 브랜치에서 직접 작업하지 않는 것이 좋습니다. 항상 작업할 내용에 맞는 의미 있는 이름의 새 브랜치를 생성해주세요.
예시:

```Bash
git checkout -b feature/new-api-endpoint -t origin/main
```

새 브랜치를 생성한 후에는 자유롭게 코드를 수정하세요!

---

주의: 여러분이 제안한 이슈와 관련 없는 다른 것들을 수정하지 마세요! 만약 다른 문제가 있다면, 별도로 새로운 이슈를 제안해주시길 바랍니다.

---

### Step 5: 변경 사항 커밋 (Commit Your Changes)

Git 사용자 이름과 이메일을 설정합니다. 이 정보는 여러분의 커밋에 기록됩니다.

```Bash
git config --global user.name "Your Name"
git config --global user.email "yourmail@example.com"
```

변경한 파일을 스테이징하고 커밋 메시지와 함께 커밋합니다.

```Bash
git add path/to/your/changed/files
git commit -m "Brief summary of changes"
```

- 커밋 메시지 작성 팁:

다른 사람들이 알아보기 쉽도록 명확한 커밋 메시지를 작성해주세요!

예시:

```Plaintext

feat: Add user authentication endpoint
```

- 필요하다면 더 자세한 설명을 작성합니다. 한 줄에 약 72자 정도로 맞춥니다.
- 어떤 경우에는 첫 줄이 이메일의 제목처럼 취급되고 나머지 텍스트는 본문처럼 다뤄집니다.
- 요약과 본문 사이에 빈 줄을 두는 것이 매우 중요합니다 (본문을 아예 생략하는 경우가 아니라면);
- 리베이스(rebase)와 같은 도구는 두 내용을 함께 실행할 경우 혼동될 수 있습니다.

추가적인 문단은 빈 줄 뒤에 이어서 작성합니다.

- Implemented POST /api/auth/login (사용자 로그인 요청을 처리하는 API 경로)
- Added Joi validation for login request body (로그인 시 전송되는 데이터 유효성 검사 기능 추가)
- Integrated with UserService.authenticateUser() (실제 사용자 인증 로직 처리 함수와 연결)
- Closes #123 (if applicable): #123번 이슈를 닫습니다. (해당하는 경우)

### Step 6: (선택 사항) 브랜치 리베이스 (Rebase Your Branch)

작업이 평소보다 오래 걸려 여러분의 로컬 저장소가 원본 저장소(upstream/master)보다 뒤쳐져 있을 수 있습니다. 항상 최신 버전으로 동기화하는 것이 좋습니다.

```Bash
git fetch upstream
git rebase upstream/master
```

### Step 7: 변경 사항 푸시 (Push Your Changes)

로컬에서 작업한 내용을 여러분의 GitHub 저장소로 푸시합니다.

푸시하기 전에, 코드 스타일 가이드를 준수해주세요. 필요하다면 eslint와 같은 린터를 실행하여 코드 형식을 맞춰주세요. 가독성이 최우선입니다!

예시 (Node.js 프로젝트의 경우 ESLint 사용):

```Bash
npx eslint --fix .
```

작업 중인 브랜치로 푸시:

```Bash
git push -u origin feature/new-api-endpoint
```

### Step 8: Pull Request 생성 (Creating the Pull Request)

이제 여러분의 브라우저에서 GitHub 저장소 페이지를 열면 **"Compare & pull request"**라는 녹색 버튼을 볼 수 있습니다. 이 버튼을 클릭하여 Pull Request를 생성합니다.

- 좋은 제목을 작성해주세요.
- 수정한 파일 이름만 나열하지 마시고, 어떤 내용을 수정했고 왜 수정했는지 자세하게 설명해주세요.
- 관련된 이슈 번호(예: #123)도 추가해주시면 좋습니다.

---

축하합니다! 여러분의 Pull Request는 프로젝트 Collaborator들에게 검토받을 것입니다. 여러분의 PR이 CI (Continuous Integration) 테스트도 통과하는지 꼭 확인해주세요.

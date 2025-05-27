-- 사용자 데이터 삽입
INSERT INTO users(
        github_user_id,
        username,
        avatar_url,
        email,
        is_pro_plan,
        pro_plan_activated_at,
        pro_plan_expires_at,
        created_at,
        updated_at
    )
VALUES (
        9911991,
        '김앨리스',
        'https://avatars.githubusercontent.com/u/9911991?v=4',
        'alice.kim@example.com',
        1,
        '2024-01-01 10:00:00',
        '2025-01-01 10:00:00',
        '2024-01-01 10:00:00',
        '2025-05-21 12:00:00'
    ),
    (
        8822882,
        '이밥',
        'https://avatars.githubusercontent.com/u/8822882?v=4',
        'bob.lee@example.com',
        0,
        NULL,
        NULL,
        '2023-11-10 08:30:00',
        '2025-05-21 12:00:00'
    ),
    (
        7733773,
        '박찰리',
        'https://avatars.githubusercontent.com/u/7733773?v=4',
        'charlie.park@example.com',
        1,
        '2024-06-01 14:30:00',
        '2025-06-01 14:30:00',
        '2024-06-01 14:30:00',
        '2025-05-21 12:00:00'
    );
-- 라이선스 데이터 삽입
INSERT INTO licenses (
        license_spdx_id,
        name,
        description_summary_html,
        permissions_json,
        conditions_json,
        limitations_json,
        source_url,
        created_at,
        updated_at
    )
VALUES (
        'MIT',
        'MIT 라이선스',
        '<p>제한 조건이 적은 허용적 라이선스로, 상업적 이용과 수정이 자유롭습니다.</p>',
        '["commercial-use", "modifications", "distribution", "private-use"]',
        '["include-copyright", "include-license"]',
        '["liability", "warranty"]',
        'https://opensource.org/licenses/MIT',
        '2020-01-01 00:00:00',
        '2025-05-21 12:00:00'
    ),
    (
        'Apache-2.0',
        '아파치 라이선스 2.0',
        '<p>기업 프로젝트에서 널리 사용되는 허용적 라이선스로, 특허 사용권과 상표권에 대한 조건이 있습니다.</p>',
        '["commercial-use", "modifications", "distribution", "patent-use", "private-use"]',
        '["include-license", "state-changes", "disclose-source"]',
        '["trademark-use", "liability", "warranty"]',
        'https://opensource.org/licenses/Apache-2.0',
        '2020-01-01 00:00:00',
        '2025-05-21 12:00:00'
    ),
    (
        'GPL-3.0-only',
        'GNU 일반 공중 라이선스 v3.0',
        '<p>강력한 카피레프트 라이선스로, 파생 작업물도 동일한 라이선스 하에 오픈소스로 공개해야 합니다.</p>',
        '["commercial-use", "modifications", "distribution", "private-use", "patent-use"]',
        '["disclose-source", "same-license", "include-license", "state-changes"]',
        '["liability", "warranty", "use-trademark"]',
        'https://www.gnu.org/licenses/gpl-3.0.html',
        '2020-01-01 00:00:00',
        '2025-05-21 12:00:00'
    ),
    (
        'BSD-3-Clause',
        'BSD 3-Clause 라이선스',
        '<p>간단하고 허용적인 라이선스로, 저작권 고지와 라이선스 텍스트 포함만을 요구합니다.</p>',
        '["commercial-use", "modifications", "distribution", "private-use"]',
        '["include-copyright", "include-license"]',
        '["liability", "warranty", "use-trademark"]',
        'https://opensource.org/licenses/BSD-3-Clause',
        '2020-01-01 00:00:00',
        '2025-05-21 12:00:00'
    );
-- 저장소 데이터 삽입
INSERT INTO repositories (
        github_repo_id,
        full_name,
        description,
        html_url,
        programming_language,
        language_percentage,
        license_spdx_id,
        readme_summary_gpt,
        star,
        fork,
        pr_total_count,
        issue_total_count,
        last_analyzed_at,
        created_at,
        updated_at
    )
VALUES (
        123456789,
        'octocat/Hello-World',
        '깃허브에서의 첫 번째 저장소입니다!',
        'https://github.com/octocat/Hello-World',
        'JavaScript',
        90,
        'MIT',
        '자바스크립트로 작성된 간단한 Hello World 프로젝트입니다.',
        1500,
        300,
        45,
        12,
        '2024-12-01 10:30:00',
        '2011-01-26 19:01:12',
        '2025-05-01 09:00:00'
    ),
    (
        234567890,
        'torvalds/linux',
        '리눅스 커널 소스 트리',
        'https://github.com/torvalds/linux',
        'C',
        95,
        'GPL-3.0-only',
        '리눅스 운영체제 커널의 소스 코드입니다.',
        150000,
        75000,
        1200,
        5000,
        '2025-05-20 14:00:00',
        '2011-09-04 22:48:00',
        '2025-05-21 12:00:00'
    ),
    (
        345678901,
        'facebook/react',
        '사용자 인터페이스 구축을 위한 선언적이고 효율적이며 유연한 자바스크립트 라이브러리',
        'https://github.com/facebook/react',
        'JavaScript',
        88,
        'MIT',
        '리액트는 현대적인 UI 구축을 위한 자바스크립트 라이브러리입니다.',
        210000,
        44000,
        500,
        1300,
        '2025-05-21 18:30:00',
        '2013-05-24 16:15:10',
        '2025-05-22 08:30:00'
    ),
    (
        456789012,
        'tensorflow/tensorflow',
        '모든 사람을 위한 오픈소스 머신러닝 프레임워크',
        'https://github.com/tensorflow/tensorflow',
        'Python',
        70,
        'Apache-2.0',
        '텐서플로우는 종단간 오픈소스 머신러닝 플랫폼입니다.',
        180000,
        85000,
        300,
        2200,
        '2025-05-20 11:45:00',
        '2015-11-09 22:25:36',
        '2025-05-21 09:10:00'
    ),
    (
        567890123,
        'microsoft/vscode',
        'Visual Studio Code - 코드 편집의 재정의',
        'https://github.com/microsoft/vscode',
        'TypeScript',
        80,
        'MIT',
        'VS Code는 가볍지만 강력한 소스 코드 에디터입니다.',
        160000,
        28000,
        600,
        1500,
        '2025-05-22 10:00:00',
        '2015-11-18 13:50:23',
        '2025-05-22 10:10:00'
    ),
    (
        5678901234,
        'vscode/Hello-World',
        'VS Code에서의 첫 번째 저장소입니다!',
        'https://github.com/vscode/Hello-World',
        'Java',
        90,
        'MIT',
        '자바로 작성된 간단한 Hello World 프로젝트입니다.',
        2500,
        300,
        45,
        12,
        '2024-12-01 10:30:00',
        '2012-01-26 19:01:12',
        '2025-05-11 09:00:00'
    ),
    (
        6789012345,
        'golang/go',
        'Go 프로그래밍 언어',
        'https://github.com/golang/go',
        'Go',
        95,
        'BSD-3-Clause',
        'Go는 구글에서 개발한 오픈소스 프로그래밍 언어입니다.',
        120000,
        17000,
        800,
        3500,
        '2025-05-21 16:00:00',
        '2014-08-19 04:33:40',
        '2025-05-22 11:00:00'
    );
-- 사용자 추적 저장소 데이터 삽입
INSERT INTO user_tracked_repositories (
        user_id,
        repo_id,
        tracked_at,
        last_viewed_at
    )
VALUES (
        1,
        1,
        '2025-05-20 10:15:30',
        '2025-05-21 08:00:00'
    ),
    (
        1,
        6,
        '2025-05-19 09:00:00',
        '2025-05-21 15:30:00'
    ),
    (
        1,
        3,
        '2025-05-18 14:20:00',
        '2025-05-22 09:45:00'
    ),
    (
        2,
        2,
        '2025-05-17 11:30:00',
        '2025-05-20 16:20:00'
    ),
    (2, 4, '2025-05-16 13:15:00', NULL),
    (
        3,
        5,
        '2025-05-15 10:00:00',
        '2025-05-21 12:30:00'
    ),
    (
        3,
        7,
        '2025-05-14 16:45:00',
        '2025-05-22 08:15:00'
    );
-- 이슈 데이터 샘플 삽입
INSERT INTO issues (
        repo_id,
        github_issue_id,
        github_issue_number,
        title,
        body,
        author,
        state,
        score,
        html_url,
        summary_gpt,
        tags_gpt_json,
        created_at_github,
        updated_at_github
    )
VALUES (
        1,
        101,
        1,
        'README 파일 개선 요청',
        'README 파일에 설치 방법과 사용 예제를 추가해주세요.',
        'user123',
        'open',
        85,
        'https://github.com/octocat/Hello-World/issues/1',
        '문서화 개선을 위한 README 파일 업데이트 요청입니다.',
        '["documentation", "enhancement", "good-first-issue"]',
        '2025-05-20 09:30:00',
        '2025-05-21 10:15:00'
    ),
    (
        3,
        201,
        2,
        '성능 최적화: useState 훅 개선',
        'useState 훅에서 불필요한 리렌더링이 발생하는 문제를 해결해야 합니다.',
        'reactdev',
        'open',
        95,
        'https://github.com/facebook/react/issues/2',
        '리액트 훅의 성능 최적화와 관련된 중요한 이슈입니다.',
        '["performance", "hooks", "bug", "high-priority"]',
        '2025-05-19 14:20:00',
        '2025-05-21 16:45:00'
    ),
    (
        4,
        301,
        3,
        '텐서플로우 2.x 호환성 문제',
        'TensorFlow 2.x에서 레거시 코드 호환성 문제가 발생합니다.',
        'mldev',
        'closed',
        78,
        'https://github.com/tensorflow/tensorflow/issues/3',
        '버전 호환성 관련 이슈로 해결되었습니다.',
        '["compatibility", "tensorflow2", "resolved"]',
        '2025-05-18 11:00:00',
        '2025-05-20 13:30:00'
    ),
    (
        1,
        102,
        4,
        '설치 스크립트 오류',
        'npm install 실행 시 오류가 발생합니다. 해결 방법을 알려주세요.',
        'user456',
        'open',
        80,
        'https://github.com/octocat/Hello-World/issues/2',
        '설치 스크립트와 관련된 오류 수정 이슈입니다.',
        '["installation", "bug", "high-priority"]',
        '2025-05-21 10:00:00',
        '2025-05-21 10:15:00'
    );
-- 챗봇 대화 데이터 삽입
INSERT INTO chat_bot_conversations (
        user_id,
        repo_id,
        created_at,
        updated_at
    )
VALUES (
        1,
        1,
        '2025-05-20 10:30:00',
        '2025-05-21 14:20:00'
    ),
    (
        1,
        3,
        '2025-05-21 09:15:00',
        '2025-05-21 16:45:00'
    ),
    (
        2,
        2,
        '2025-05-19 14:00:00',
        '2025-05-20 11:30:00'
    ),
    (
        3,
        5,
        '2025-05-18 16:20:00',
        '2025-05-19 10:15:00'
    );
-- 챗봇 메시지 데이터 삽입
INSERT INTO chat_bot_messages (
        conversation_id,
        sender_type,
        content,
        timestamp
    )
VALUES (
        1,
        'User',
        'Hello World 프로젝트를 시작하는 방법을 알려주세요.',
        '2025-05-20 10:30:00'
    ),
    (
        1,
        'Agent',
        '안녕하세요! Hello World 프로젝트를 시작하려면 먼저 저장소를 클론하고 npm install을 실행해주세요.',
        '2025-05-20 10:31:00'
    ),
    (
        1,
        'User',
        '의존성 설치 후 어떤 스크립트를 실행해야 하나요?',
        '2025-05-20 10:32:00'
    ),
    (
        1,
        'Agent',
        'npm start 명령어로 개발 서버를 시작할 수 있습니다. 포트 3000에서 실행됩니다.',
        '2025-05-20 10:33:00'
    ),
    (
        2,
        'User',
        'React 훅 성능 최적화에 대해 질문이 있습니다.',
        '2025-05-21 09:15:00'
    ),
    (
        2,
        'Agent',
        'React 훅 성능 최적화는 useMemo, useCallback, React.memo를 적절히 활용하는 것이 중요합니다. 어떤 부분에 대해 궁금하신가요?',
        '2025-05-21 09:16:00'
    ),
    (
        3,
        'User',
        '리눅스 커널 빌드 방법을 알려주세요.',
        '2025-05-19 14:00:00'
    ),
    (
        3,
        'Agent',
        '리눅스 커널 빌드는 make menuconfig로 설정 후 make -j$(nproc) 명령어로 수행할 수 있습니다.',
        '2025-05-19 14:01:00'
    ),
    (
        4,
        'User',
        'VS Code 확장 개발을 시작하고 싶습니다.',
        '2025-05-18 16:20:00'
    ),
    (
        4,
        'Agent',
        'VS Code 확장 개발은 yo code 제너레이터로 시작할 수 있습니다. TypeScript 템플릿을 추천드립니다.',
        '2025-05-18 16:21:00'
    );
-- 추천 코드 스니펫 데이터 삽입
INSERT INTO recommended_code_snippets (
        issue_id,
        file_path,
        function_name,
        class_name,
        code_snippet,
        relevance_score,
        explanation_gpt,
        created_at
    )
VALUES (
        1,
        'src/README.md',
        NULL,
        NULL,
        '## 설치 방법\n\n```bash\nnpm install\nnpm start\n```\n\n## 사용 예제\n\n```javascript\nconsole.log("Hello, World!");\n```',
        92.50,
        'README 파일 개선을 위한 설치 방법과 사용 예제 섹션입니다.',
        '2025-05-20 10:00:00'
    ),
    (
        1,
        'docs/getting-started.md',
        NULL,
        NULL,
        '# 시작하기\n\n이 프로젝트는 JavaScript 기반의 Hello World 예제입니다.\n\n### 빠른 시작\n1. 저장소 클론\n2. 의존성 설치\n3. 개발 서버 실행',
        87.25,
        '시작하기 가이드 문서의 기본 구조를 제안합니다.',
        '2025-05-20 10:05:00'
    ),
    (
        2,
        'src/hooks/useState.js',
        'optimizedUseState',
        NULL,
        'import { useState, useCallback, useMemo } from "react";\n\nexport const optimizedUseState = (initialValue) => {\n  const [value, setValue] = useState(initialValue);\n  \n  const memoizedValue = useMemo(() => value, [value]);\n  const memoizedSetter = useCallback((newValue) => {\n    setValue(newValue);\n  }, []);\n  \n  return [memoizedValue, memoizedSetter];\n};',
        95.80,
        'useState 훅의 성능을 최적화한 커스텀 훅 예제입니다. useMemo와 useCallback을 활용하여 불필요한 리렌더링을 방지합니다.',
        '2025-05-19 15:30:00'
    ),
    (
        2,
        'src/components/OptimizedComponent.jsx',
        NULL,
        'OptimizedComponent',
        'import React, { memo, useCallback } from "react";\n\nconst OptimizedComponent = memo(({ data, onUpdate }) => {\n  const handleClick = useCallback(() => {\n    onUpdate(data.id);\n  }, [data.id, onUpdate]);\n  \n  return (\n    <div onClick={handleClick}>\n      {data.name}\n    </div>\n  );\n});\n\nexport default OptimizedComponent;',
        91.35,
        'React.memo와 useCallback을 활용한 컴포넌트 최적화 예제입니다.',
        '2025-05-19 15:35:00'
    ),
    (
        3,
        'src/tensorflow/compatibility.py',
        'convert_to_tf2',
        'TensorFlowConverter',
        'import tensorflow.compat.v1 as tf1\nimport tensorflow as tf2\n\nclass TensorFlowConverter:\n    def convert_to_tf2(self, legacy_model):\n        """TensorFlow 1.x 모델을 2.x로 변환"""\n        tf1.disable_v2_behavior()\n        \n        # 레거시 세션 코드를 eager execution으로 변환\n        @tf2.function\n        def converted_function(inputs):\n            return legacy_model(inputs)\n        \n        return converted_function',
        89.60,
        'TensorFlow 1.x에서 2.x로 마이그레이션을 위한 호환성 레이어 코드입니다.',
        '2025-05-18 12:15:00'
    ),
    (
        3,
        'tests/compatibility_test.py',
        'test_tf2_compatibility',
        'CompatibilityTest',
        'import unittest\nimport tensorflow as tf\n\nclass CompatibilityTest(unittest.TestCase):\n    def test_tf2_compatibility(self):\n        """TF 2.x 호환성 테스트"""\n        # 테스트 데이터 준비\n        test_input = tf.constant([[1.0, 2.0], [3.0, 4.0]])\n        \n        # 모델 실행 및 검증\n        result = self.model(test_input)\n        self.assertIsNotNone(result)\n        \n    def setUp(self):\n        self.model = tf.keras.Sequential([\n            tf.keras.layers.Dense(10, activation="relu"),\n            tf.keras.layers.Dense(1)\n        ])',
        85.40,
        'TensorFlow 2.x 호환성을 검증하는 테스트 코드 예제입니다.',
        '2025-05-18 12:20:00'
    );
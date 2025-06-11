-- 테이블 삭제 (참조 관계 역순 또는 제약조건 비활성화 후 삭제)
DROP TABLE IF EXISTS `user_tracked_repositories`;
DROP TABLE IF EXISTS `recommended_code_snippets`;
DROP TABLE IF EXISTS `chat_bot_messages`;
DROP TABLE IF EXISTS `chat_bot_conversations`;
DROP TABLE IF EXISTS `user_recent_issues`;
DROP TABLE IF EXISTS `issues`;
DROP TABLE IF EXISTS `repository_languages`;
DROP TABLE IF EXISTS `repositories`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `licenses`;
-- 테이블 생성
-- users 테이블
CREATE TABLE `users` (
  `user_id` BIGINT NOT NULL AUTO_INCREMENT,
  `github_user_id` BIGINT NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `email` VARCHAR(320) NULL UNIQUE,
  `refresh_token` VARCHAR(500) NULL,
  `refresh_token_expires_at` TIMESTAMP NULL,
  `is_pro_plan` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '현재 Pro 플랜 활성 상태 여부',
  `pro_plan_activated_at` TIMESTAMP NULL COMMENT 'Pro 플랜 시작일 또는 마지막 갱신일',
  `pro_plan_expires_at` TIMESTAMP NULL COMMENT 'Pro 플랜 만료일 (NULL이면 무기한 또는 다른 로직)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_email_notification` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 COMMENT '이메일 알림 전송 여부',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `UK_github_user_id` (`github_user_id`),
  CHECK (
    `email` LIKE '%@%.%'
    OR `email` IS NULL
  )
);
-- licenses 테이블
CREATE TABLE `licenses` (
  `license_spdx_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description_summary_html` TEXT NULL COMMENT 'license 특징, 의무사항 요약',
  `permissions_json` JSON NULL,
  `conditions_json` JSON NULL,
  `limitations_json` JSON NULL,
  PRIMARY KEY (`license_spdx_id`)
);
-- repositories 테이블 (분석 상태 컬럼 추가, 언어 관련 컬럼 제거)
CREATE TABLE `repositories` (
  `repo_id` BIGINT NOT NULL AUTO_INCREMENT,
  `github_repo_id` BIGINT NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `html_url` VARCHAR(500) NOT NULL,
  `license_spdx_id` VARCHAR(50) NULL COMMENT '해당 repo의 license 종류',
  `readme_summary_gpt` TEXT NULL,
  `readme_filename` VARCHAR(100) NULL COMMENT 'README 파일명 (README.md, README.rst 등)',
  `license_filename` VARCHAR(100) NULL COMMENT 'LICENSE 파일명 (LICENSE, LICENSE.md 등)',
  `contributing_filename` VARCHAR(100) NULL COMMENT 'CONTRIBUTING 파일명 (CONTRIBUTING.md, CONTRIBUTING.rst 등)',
  `default_branch` VARCHAR(100) NULL DEFAULT 'main' COMMENT '저장소 기본 브랜치명',
  `star` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `fork` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `pr_total_count` INT UNSIGNED DEFAULT 0 COMMENT 'PR 총 개수',
  `issue_total_count` INT UNSIGNED NULL DEFAULT 0,
  `last_analyzed_at` TIMESTAMP NULL COMMENT '분석 요청 완료된 시간',
  -- 새로 추가된 분석 상태 관련 컬럼들
  `analysis_status` ENUM(
    'not_analyzed',
    'analyzing',
    'completed',
    'failed'
  ) NOT NULL DEFAULT 'not_analyzed' COMMENT '분석 상태',
  `analysis_progress` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '분석 진행률 (0-100)',
  `analysis_current_step` VARCHAR(255) NULL COMMENT '현재 분석 단계',
  `analysis_error_message` TEXT NULL COMMENT '분석 실패 시 오류 메시지',
  `analysis_started_at` TIMESTAMP NULL COMMENT '분석 시작 시간',
  `analysis_completed_at` TIMESTAMP NULL COMMENT '분석 완료 시간',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`repo_id`),
  UNIQUE KEY `UK_github_repo_id` (`github_repo_id`),
  CONSTRAINT `FK_repositories_licenses` FOREIGN KEY (`license_spdx_id`) REFERENCES `licenses` (`license_spdx_id`) ON DELETE
  SET NULL ON UPDATE CASCADE,
    CHECK (
      `star` >= 0
      AND `fork` >= 0
    ),
    CHECK (
      `analysis_progress` BETWEEN 0 AND 100
    )
);
-- repository_languages 테이블 (새로 추가)
CREATE TABLE `repository_languages` (
  `repo_id` BIGINT NOT NULL,
  `language_name` VARCHAR(100) NOT NULL,
  `percentage` DECIMAL(5, 2) NOT NULL COMMENT '해당 언어의 비율 (0.00-100.00)',
  `bytes_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '해당 언어로 작성된 바이트 수',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `PK_repository_languages` PRIMARY KEY (`repo_id`, `language_name`),
  CONSTRAINT `FK_repository_languages_repositories` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`repo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (
    `percentage` BETWEEN 0.00 AND 100.00
  ),
  CHECK (`bytes_count` >= 0)
);
-- issues 테이블
CREATE TABLE `issues` (
  `issue_id` BIGINT NOT NULL AUTO_INCREMENT,
  `repo_id` BIGINT NOT NULL,
  `github_issue_id` BIGINT NOT NULL,
  `github_issue_number` INT UNSIGNED NOT NULL,
  `title` VARCHAR(1000) NOT NULL,
  `body` LONGTEXT NULL,
  `author` VARCHAR(255) NOT NULL COMMENT 'github username',
  `state` ENUM('open', 'closed', 'draft') NOT NULL DEFAULT 'open',
  `score` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'AI 분석 기반 관련도/중요도 점수 (0-100)',
  `html_url` VARCHAR(500) NOT NULL,
  `summary_gpt` TEXT NULL,
  `solution_suggestion_gpt` TEXT NULL,
  `tags_gpt_json` JSON NULL COMMENT 'GPT가 정의한 tag',
  `created_at_github` TIMESTAMP NOT NULL,
  `updated_at_github` TIMESTAMP NOT NULL,
  `created_at_db` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at_db` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`issue_id`),
  UNIQUE KEY `UK_repo_github_issue_id` (`repo_id`, `github_issue_id`),
  CONSTRAINT `FK_issues_repositories` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`repo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (
    `score` BETWEEN 0 AND 100
  )
);
-- chat_bot_conversations 테이블
CREATE TABLE `chat_bot_conversations` (
  `conversation_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `repo_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversation_id`),
  CONSTRAINT `FK_chat_bot_conversations_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_chat_bot_conversations_repositories` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`repo_id`) ON DELETE CASCADE ON UPDATE CASCADE
);
-- chat_bot_messages 테이블
CREATE TABLE `chat_bot_messages` (
  `message_id` BIGINT NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT NOT NULL,
  `sender_type` ENUM('Agent', 'User') NOT NULL COMMENT 'Agent or User',
  `content` TEXT NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  CONSTRAINT `FK_chat_bot_messages_chat_bot_conversations` FOREIGN KEY (`conversation_id`) REFERENCES `chat_bot_conversations` (`conversation_id`) ON DELETE CASCADE ON UPDATE CASCADE
);
-- user_tracked_repositories 테이블
CREATE TABLE `user_tracked_repositories` (
  `user_id` BIGINT NOT NULL,
  `repo_id` BIGINT NOT NULL,
  `tracked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'github url로 분석 요청일',
  `last_viewed_at` TIMESTAMP NULL COMMENT '유저가 마지막으로 분석을 본 날짜',
  `is_favorite` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '즐겨찾기 여부',
  CONSTRAINT `PK_user_repo` PRIMARY KEY (`user_id`, `repo_id`),
  CONSTRAINT `FK_user_tracked_repositories_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_user_tracked_repositories_repositories` FOREIGN KEY (`repo_id`) REFERENCES `repositories` (`repo_id`) ON DELETE CASCADE ON UPDATE CASCADE
);
-- recommended_code_snippets 테이블
CREATE TABLE `recommended_code_snippets` (
  `recommendation_id` BIGINT NOT NULL AUTO_INCREMENT,
  `issue_id` BIGINT NOT NULL,
  `file_path` VARCHAR(2048) NOT NULL,
  `github_url` VARCHAR(500) NULL COMMENT 'GitHub 파일 URL',
  `function_name` VARCHAR(255) NULL,
  `class_name` VARCHAR(255) NULL,
  `code_snippet` MEDIUMTEXT NOT NULL,
  `relevance_score` DECIMAL(5, 2) NULL COMMENT '코드 유사도 (0-100)',
  `explanation_gpt` TEXT NULL,
  `type` ENUM('file', 'snippet') NOT NULL DEFAULT 'snippet' COMMENT '추천 유형(관련 파일/코드 스니펫)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recommendation_id`),
  CONSTRAINT `FK_recommended_code_snippets_issues` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`issue_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (
    `relevance_score` BETWEEN 0 AND 100
    OR `relevance_score` IS NULL
  )
);
-- 최근 본 이슈 테이블 생성 (user_recent_issues)
CREATE TABLE `user_recent_issues` (
  `user_id` BIGINT NOT NULL,
  `issue_id` BIGINT NOT NULL,
  `viewed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `issue_id`),
  CONSTRAINT `FK_user_recent_issues_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_user_recent_issues_issues` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`issue_id`) ON DELETE CASCADE ON UPDATE CASCADE
);
-- 인덱스 생성
-- (PK는 자동으로 인덱스 생성됨)
-- users
CREATE INDEX `IX_users_email` ON `users`(`email`);
CREATE INDEX `IX_users_is_pro_plan` ON `users`(`is_pro_plan`);
CREATE INDEX `IX_users_pro_plan_expires_at` ON `users`(`pro_plan_expires_at`);
CREATE INDEX `IX_users_created_at` ON `users`(`created_at`);
CREATE INDEX `IX_users_refresh_token` ON `users`(`refresh_token`);
CREATE INDEX `IX_users_refresh_token_expires_at` ON `users`(`refresh_token_expires_at`);
-- repositories
CREATE INDEX `IX_repositories_full_name` ON `repositories`(`full_name`);
CREATE INDEX `IX_repositories_license_spdx_id` ON `repositories`(`license_spdx_id`);
CREATE INDEX `IX_repositories_star_fork` ON `repositories`(`star` DESC, `fork` DESC);
CREATE INDEX `IX_repositories_last_analyzed_at` ON `repositories`(`last_analyzed_at`);
CREATE FULLTEXT INDEX `FT_repositories_full_name` ON `repositories`(`full_name`);
-- 새로 추가된 분석 상태 관련 인덱스
CREATE INDEX `IX_repositories_analysis_status` ON `repositories`(`analysis_status`);
CREATE INDEX `IX_repositories_analysis_completed_at` ON `repositories`(`analysis_completed_at`);
CREATE INDEX `IX_repositories_analysis_started_at` ON `repositories`(`analysis_started_at`);
-- issues
CREATE INDEX `IX_issues_repo_id_state` ON `issues`(`repo_id`, `state`);
CREATE INDEX `IX_issues_github_issue_number` ON `issues`(`github_issue_number`);
CREATE INDEX `IX_issues_score` ON `issues`(`score` DESC);
CREATE INDEX `IX_issues_created_at_github` ON `issues`(`created_at_github`);
CREATE FULLTEXT INDEX `FT_issues_title` ON `issues`(`title`);
-- chat_bot_conversations
CREATE INDEX `IX_chat_bot_conversations_user_repo` ON `chat_bot_conversations`(`user_id`, `repo_id`);
CREATE INDEX `IX_chat_bot_conversations_created_at` ON `chat_bot_conversations`(`created_at`);
-- chat_bot_messages
CREATE INDEX `IX_chat_bot_messages_conversation_timestamp` ON `chat_bot_messages`(`conversation_id`, `timestamp`);
-- user_tracked_repositories
CREATE INDEX `IX_user_tracked_repositories_repo_id` ON `user_tracked_repositories`(`repo_id`);
CREATE INDEX `IX_user_tracked_repositories_tracked_at` ON `user_tracked_repositories`(`tracked_at`);
-- recommended_code_snippets
CREATE INDEX `IX_recommended_code_snippets_issue_score` ON `recommended_code_snippets`(`issue_id`, `relevance_score` DESC);
CREATE INDEX `IX_recommended_code_snippets_file_path` ON `recommended_code_snippets`(`file_path`(255));
-- repository_languages 인덱스
CREATE INDEX `IX_repository_languages_language_name` ON `repository_languages`(`language_name`);
CREATE INDEX `IX_repository_languages_percentage` ON `repository_languages`(`percentage` DESC);
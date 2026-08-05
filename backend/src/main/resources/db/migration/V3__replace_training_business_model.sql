DROP TABLE IF EXISTS training_record;

CREATE TABLE learning_step_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    route_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(32) NOT NULL,
    step_type VARCHAR(32) NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_learning_step_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT uq_learning_step UNIQUE (user_id, route_id, content_version, step_type)
);

CREATE TABLE basic_question_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    route_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(32) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    correct_once BOOLEAN NOT NULL,
    first_correct_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_basic_question_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT uq_basic_question UNIQUE (user_id, route_id, content_version, question_id)
);

CREATE TABLE comprehensive_practice_draft (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    route_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(32) NOT NULL,
    answer TEXT NOT NULL,
    revision BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    submitted_attempt_id BIGINT NULL,
    CONSTRAINT fk_comprehensive_draft_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT uq_comprehensive_draft UNIQUE (user_id, route_id)
);

CREATE TABLE formal_attempt (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    route_id VARCHAR(64) NOT NULL,
    client_request_id VARCHAR(64) NOT NULL,
    answer_snapshot TEXT NOT NULL,
    content_version VARCHAR(32) NOT NULL,
    rubric_version VARCHAR(32) NOT NULL,
    content_snapshot_json TEXT NOT NULL,
    rubric_snapshot_json TEXT NOT NULL,
    processing_status VARCHAR(16) NOT NULL,
    conclusion VARCHAR(32) NULL,
    scoring_run_count INT NOT NULL,
    technical_error_code VARCHAR(64) NULL,
    submitted_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_formal_attempt_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT uq_formal_attempt_user_request UNIQUE (user_id, client_request_id)
);

CREATE INDEX ix_attempt_user_submitted ON formal_attempt(user_id, submitted_at);
CREATE INDEX ix_attempt_user_route ON formal_attempt(user_id, route_id);

ALTER TABLE comprehensive_practice_draft
    ADD CONSTRAINT fk_comprehensive_draft_attempt
    FOREIGN KEY (submitted_attempt_id) REFERENCES formal_attempt(id);

CREATE TABLE scoring_result (
    attempt_id BIGINT PRIMARY KEY,
    total_score INT NOT NULL,
    result_snapshot_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_scoring_result_attempt FOREIGN KEY (attempt_id) REFERENCES formal_attempt(id)
);

CREATE TABLE remediation_plan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    route_id VARCHAR(64) NOT NULL,
    active BOOLEAN NOT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_remediation_plan_attempt FOREIGN KEY (attempt_id) REFERENCES formal_attempt(id),
    CONSTRAINT fk_remediation_plan_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT uq_remediation_plan_attempt UNIQUE (attempt_id)
);

CREATE TABLE remediation_target (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    target_snapshot_json TEXT NOT NULL,
    completed BOOLEAN NOT NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_remediation_target_plan FOREIGN KEY (plan_id) REFERENCES remediation_plan(id),
    CONSTRAINT uq_remediation_target UNIQUE (plan_id, target_id)
);

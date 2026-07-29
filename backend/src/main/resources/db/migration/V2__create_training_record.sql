CREATE TABLE training_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    case_id VARCHAR(32) NOT NULL,
    case_version VARCHAR(64) NOT NULL,
    rubric_version VARCHAR(64) NOT NULL,
    client_request_id VARCHAR(64) NOT NULL,
    answer TEXT NOT NULL,
    total_score INT NOT NULL,
    reviewer_mode VARCHAR(32) NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_training_record_user
        FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT uq_training_record_user_request
        UNIQUE (user_id, client_request_id)
);

CREATE INDEX ix_training_record_user_created
    ON training_record(user_id, created_at);

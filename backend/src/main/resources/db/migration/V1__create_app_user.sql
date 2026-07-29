CREATE TABLE app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_no VARCHAR(32) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_app_user_employee_no UNIQUE (employee_no)
);

package com.ccb.custodytraining.user;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<AppUser> findByEmployeeNo(String employeeNo) {
        List<AppUser> users = jdbcTemplate.query(
                "SELECT id, employee_no, display_name, password_hash, enabled "
                        + "FROM app_user WHERE employee_no = ?",
                this::mapUser,
                employeeNo
        );
        return users.stream().findFirst();
    }

    public boolean existsByEmployeeNo(String employeeNo) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM app_user WHERE employee_no = ?",
                Integer.class,
                employeeNo
        );
        return count != null && count > 0;
    }

    public AppUser insert(String employeeNo, String displayName, String passwordHash) {
        jdbcTemplate.update(
                "INSERT INTO app_user "
                        + "(employee_no, display_name, password_hash, enabled, created_at) "
                        + "VALUES (?, ?, ?, ?, ?)",
                employeeNo,
                displayName,
                passwordHash,
                true,
                Timestamp.from(Instant.now())
        );
        return findByEmployeeNo(employeeNo)
                .orElseThrow(() -> new IllegalStateException("新建用户后无法读取用户记录"));
    }

    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM app_user", Long.class);
        return count == null ? 0L : count;
    }

    private AppUser mapUser(ResultSet resultSet, int rowNumber) throws SQLException {
        return new AppUser(
                resultSet.getLong("id"),
                resultSet.getString("employee_no"),
                resultSet.getString("display_name"),
                resultSet.getString("password_hash"),
                resultSet.getBoolean("enabled")
        );
    }
}

package com.ccb.custodytraining.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.ccb.custodytraining.user.UserRepository;

@Component
@Profile("mock")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class MockUserBootstrapper implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Demo@1234";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public MockUserBootstrapper(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        createIfMissing("10000001", "清算学员");
        createIfMissing("10000002", "核算学员");
    }

    private void createIfMissing(String employeeNo, String displayName) {
        if (!userRepository.existsByEmployeeNo(employeeNo)) {
            userRepository.insert(employeeNo, displayName, passwordEncoder.encode(DEMO_PASSWORD));
        }
    }
}

package com.ccb.custodytraining.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.ccb.custodytraining.user.UserRepository;

@Component
@Profile("internal")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class InternalUserBootstrapper implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BootstrapUser user1;
    private final BootstrapUser user2;

    public InternalUserBootstrapper(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.auth.bootstrap.user1.employee-no:}") String user1EmployeeNo,
            @Value("${app.auth.bootstrap.user1.display-name:}") String user1DisplayName,
            @Value("${app.auth.bootstrap.user1.password:}") String user1Password,
            @Value("${app.auth.bootstrap.user2.employee-no:}") String user2EmployeeNo,
            @Value("${app.auth.bootstrap.user2.display-name:}") String user2DisplayName,
            @Value("${app.auth.bootstrap.user2.password:}") String user2Password
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.user1 = new BootstrapUser(user1EmployeeNo, user1DisplayName, user1Password);
        this.user2 = new BootstrapUser(user2EmployeeNo, user2DisplayName, user2Password);
    }

    @Override
    public void run(String... args) {
        createIfComplete(user1);
        createIfComplete(user2);
    }

    private void createIfComplete(BootstrapUser user) {
        if (user.complete() && !userRepository.existsByEmployeeNo(user.employeeNo())) {
            userRepository.insert(
                    user.employeeNo(),
                    user.displayName(),
                    passwordEncoder.encode(user.password())
            );
        }
    }

    private record BootstrapUser(String employeeNo, String displayName, String password) {

        private boolean complete() {
            return employeeNo != null && !employeeNo.trim().isEmpty()
                    && displayName != null && !displayName.trim().isEmpty()
                    && password != null && !password.isEmpty();
        }
    }
}

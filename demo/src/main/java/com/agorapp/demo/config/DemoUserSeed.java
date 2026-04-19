package com.agorapp.demo.config;

import com.agorapp.demo.user.UserEntity;
import com.agorapp.demo.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.seed-demo-user", havingValue = "true", matchIfMissing = true)
public class DemoUserSeed implements CommandLineRunner {

    private static final String DEMO_USER = "alice";
    private static final String DEMO_PASSWORD = "Secret123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoUserSeed(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.existsByUsername(DEMO_USER)) {
            return;
        }
        UserEntity user = new UserEntity();
        user.setUsername(DEMO_USER);
        user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        userRepository.save(user);
    }
}

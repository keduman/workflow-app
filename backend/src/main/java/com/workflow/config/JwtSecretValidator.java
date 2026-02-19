package com.workflow.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Fails startup in non-dev profiles if JWT secret is unset or equals the default (in-repo) value.
 */
@Component
@Profile("!dev")
public class JwtSecretValidator implements ApplicationRunner {

    private static final String DEFAULT_SECRET_B64 = "c2VjdXJlLWp3dC1zZWNyZXQta2V5LWZvci13b3JrZmxvdy1lbmdpbmUtYXBwbGljYXRpb24tMjAyNA==";

    @Value("${app.jwt.secret}")
    private String secret;

    @Override
    public void run(ApplicationArguments args) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET must be set in production. Set the app.jwt.secret property or JWT_SECRET environment variable.");
        }
        if (DEFAULT_SECRET_B64.equals(secret.trim())) {
            throw new IllegalStateException("JWT_SECRET must not use the default value in production. Set a secure, unique secret via JWT_SECRET environment variable.");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters (256 bits recommended for HS256).");
        }
    }
}

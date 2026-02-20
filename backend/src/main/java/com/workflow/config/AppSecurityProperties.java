package com.workflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security")
public record AppSecurityProperties(
        boolean h2ConsoleEnabled,
        boolean secureCookies
) {}

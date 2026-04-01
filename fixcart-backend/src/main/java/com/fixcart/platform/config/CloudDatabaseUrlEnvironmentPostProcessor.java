package com.fixcart.platform.config;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class CloudDatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String rawUrl = firstNonBlank(
                environment.getProperty("JDBC_DATABASE_URL"),
                environment.getProperty("DATABASE_URL"),
                environment.getProperty("SPRING_DATASOURCE_URL")
        );

        if (rawUrl == null) {
            return;
        }

        String jdbcUrl = toJdbcUrl(rawUrl);
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("spring.datasource.url", jdbcUrl);

        Credentials credentials = extractCredentials(rawUrl);
        if (credentials.username() != null && environment.getProperty("spring.datasource.username") == null) {
            properties.put("spring.datasource.username", credentials.username());
        }
        if (credentials.password() != null && environment.getProperty("spring.datasource.password") == null) {
            properties.put("spring.datasource.password", credentials.password());
        }

        environment.getPropertySources().addFirst(new MapPropertySource("fixcartCloudDatabase", properties));
    }

    private String toJdbcUrl(String rawUrl) {
        if (rawUrl.startsWith("jdbc:")) {
            return rawUrl;
        }
        if (rawUrl.startsWith("postgres://")) {
            return "jdbc:postgresql://" + rawUrl.substring("postgres://".length());
        }
        if (rawUrl.startsWith("postgresql://")) {
            return "jdbc:postgresql://" + rawUrl.substring("postgresql://".length());
        }
        return rawUrl;
    }

    private Credentials extractCredentials(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl.replaceFirst("^jdbc:", ""));
            if (uri.getUserInfo() == null || uri.getUserInfo().isBlank()) {
                return new Credentials(null, null);
            }

            String[] parts = uri.getUserInfo().split(":", 2);
            String username = parts.length > 0 && !parts[0].isBlank() ? parts[0] : null;
            String password = parts.length > 1 && !parts[1].isBlank() ? parts[1] : null;
            return new Credentials(username, password);
        } catch (Exception ignored) {
            return new Credentials(null, null);
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private record Credentials(String username, String password) {
    }
}

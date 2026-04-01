package com.fixcart.platform.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.push", name = "provider", havingValue = "expo")
public class ExpoPushNotificationProvider implements PushNotificationProvider {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushNotificationProvider.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String endpoint;
    private final String accessToken;

    public ExpoPushNotificationProvider(
            ObjectMapper objectMapper,
            @Value("${app.push.expo.endpoint:https://exp.host/--/api/v2/push/send}") String endpoint,
            @Value("${app.push.expo.access-token:}") String accessToken
    ) {
        this.objectMapper = objectMapper;
        this.endpoint = endpoint;
        this.accessToken = accessToken;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public void send(List<String> tokens, String title, String body, Map<String, String> data) {
        List<String> expoTokens = tokens.stream()
                .filter(token -> token != null && token.startsWith("ExponentPushToken["))
                .distinct()
                .toList();

        if (expoTokens.isEmpty()) {
            log.info("No Expo push tokens eligible for delivery");
            return;
        }

        List<Map<String, Object>> messages = expoTokens.stream()
                .map(token -> Map.<String, Object>of(
                        "to", token,
                        "title", title,
                        "body", body,
                        "sound", "default",
                        "data", data == null ? Map.of() : data
                ))
                .toList();

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(messages)));

            if (accessToken != null && !accessToken.isBlank()) {
                builder.header("Authorization", "Bearer " + accessToken.trim());
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Expo push notification request accepted for {} device(s)", expoTokens.size());
            } else {
                log.warn("Expo push notification request failed with status {} and body {}", response.statusCode(), response.body());
            }
        } catch (JsonProcessingException exception) {
            log.error("Unable to serialize Expo push notification payload", exception);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("Failed to send Expo push notification", exception);
        }
    }
}

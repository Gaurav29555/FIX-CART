package com.fixcart.platform.notification;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.common.ApiMessage;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationService {

    private final DevicePushTokenRepository devicePushTokenRepository;
    private final UserRepository userRepository;
    private final PushNotificationProvider pushNotificationProvider;

    public NotificationService(
            DevicePushTokenRepository devicePushTokenRepository,
            UserRepository userRepository,
            PushNotificationProvider pushNotificationProvider
    ) {
        this.devicePushTokenRepository = devicePushTokenRepository;
        this.userRepository = userRepository;
        this.pushNotificationProvider = pushNotificationProvider;
    }

    public NotificationDtos.DeviceTokenResponse registerDeviceToken(UUID userId, NotificationDtos.RegisterDeviceTokenRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        DevicePushToken token = devicePushTokenRepository.findByDeviceToken(request.token())
                .orElseGet(DevicePushToken::new);
        token.setUser(user);
        token.setPlatform(request.platform().trim().toLowerCase());
        token.setDeviceToken(request.token().trim());
        token.setActive(true);
        token.setLastSeenAt(Instant.now());
        DevicePushToken saved = devicePushTokenRepository.save(token);
        return new NotificationDtos.DeviceTokenResponse(saved.getId(), saved.getPlatform(), saved.getDeviceToken(), saved.isActive());
    }

    public ApiMessage sendToUser(UUID userId, String title, String body, Map<String, String> data) {
        List<String> tokens = devicePushTokenRepository.findByUserIdAndActiveTrue(userId).stream()
                .map(DevicePushToken::getDeviceToken)
                .distinct()
                .toList();
        if (!tokens.isEmpty()) {
            pushNotificationProvider.send(tokens, title, body, data == null ? Map.of() : data);
        }
        return new ApiMessage(tokens.isEmpty() ? "No active device token registered" : "Notification dispatched");
    }
}

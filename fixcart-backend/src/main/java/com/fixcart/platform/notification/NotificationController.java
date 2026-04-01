package com.fixcart.platform.notification;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import com.fixcart.platform.common.ApiMessage;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/device-tokens")
    public NotificationDtos.DeviceTokenResponse registerDeviceToken(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @Valid @RequestBody NotificationDtos.RegisterDeviceTokenRequest request
    ) {
        return notificationService.registerDeviceToken(principal.getUserId(), request);
    }

    @PostMapping("/users/{userId}/test")
    public ApiMessage sendTestNotification(
            @PathVariable UUID userId,
            @Valid @RequestBody NotificationDtos.DispatchNotificationRequest request
    ) {
        return notificationService.sendToUser(userId, request.title(), request.body(), request.data());
    }
}

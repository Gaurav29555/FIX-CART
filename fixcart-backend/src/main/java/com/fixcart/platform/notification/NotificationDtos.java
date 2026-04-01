package com.fixcart.platform.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;

public class NotificationDtos {

    public record RegisterDeviceTokenRequest(
            @NotBlank String platform,
            @NotBlank @Size(max = 500) String token
    ) {}

    public record DeviceTokenResponse(
            UUID id,
            String platform,
            String token,
            boolean active
    ) {}

    public record DispatchNotificationRequest(
            @NotBlank String title,
            @NotBlank String body,
            Map<String, String> data
    ) {}
}

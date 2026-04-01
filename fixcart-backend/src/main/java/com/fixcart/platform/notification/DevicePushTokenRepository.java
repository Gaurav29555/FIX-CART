package com.fixcart.platform.notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DevicePushTokenRepository extends JpaRepository<DevicePushToken, UUID> {

    Optional<DevicePushToken> findByDeviceToken(String deviceToken);

    List<DevicePushToken> findByUserIdAndActiveTrue(UUID userId);
}

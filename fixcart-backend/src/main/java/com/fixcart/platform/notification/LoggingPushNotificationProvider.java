package com.fixcart.platform.notification;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.push", name = "provider", havingValue = "log", matchIfMissing = true)
public class LoggingPushNotificationProvider implements PushNotificationProvider {

    private static final Logger log = LoggerFactory.getLogger(LoggingPushNotificationProvider.class);

    @Override
    public void send(List<String> tokens, String title, String body, Map<String, String> data) {
        log.info("Push notification dispatch prepared for {} device(s): title='{}', body='{}', data={}", tokens.size(), title, body, data);
    }
}


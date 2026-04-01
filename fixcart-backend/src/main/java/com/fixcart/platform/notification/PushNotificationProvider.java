package com.fixcart.platform.notification;

import java.util.List;
import java.util.Map;

public interface PushNotificationProvider {

    void send(List<String> tokens, String title, String body, Map<String, String> data);
}

package com.fixcart.platform.moderation;

import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class ContentModerationService {

    private static final List<String> BLOCKED_TERMS = List.of(
            "idiot",
            "stupid",
            "scam",
            "fraud",
            "abuse",
            "hate"
    );

    public String sanitizeAndValidate(String value, String fieldName, int maxLength) {
        if (value == null) {
            throw new IllegalStateException(fieldName + " is required");
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            throw new IllegalStateException(fieldName + " is required");
        }
        if (normalized.length() > maxLength) {
            throw new IllegalStateException(fieldName + " is too long");
        }

        String lower = normalized.toLowerCase(Locale.ROOT);
        boolean blocked = BLOCKED_TERMS.stream().anyMatch(lower::contains);
        if (blocked) {
            throw new IllegalStateException(fieldName + " contains blocked abusive wording");
        }
        return normalized;
    }
}

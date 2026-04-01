package com.fixcart.platform.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ChatDtos {

    public record SendMessageRequest(@NotBlank @Size(max = 500) String message) {}

    public record ChatMessageResponse(
            UUID id,
            UUID senderId,
            String senderName,
            String message,
            Instant sentAt
    ) {}

    public record ChatRoomResponse(
            UUID roomId,
            UUID bookingId,
            List<ChatMessageResponse> messages
    ) {}
}

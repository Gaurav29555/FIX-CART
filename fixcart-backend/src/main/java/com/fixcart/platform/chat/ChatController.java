package com.fixcart.platform.chat;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/bookings/{bookingId}")
    public ChatDtos.ChatRoomResponse room(@PathVariable UUID bookingId) {
        return chatService.getRoom(bookingId);
    }

    @PostMapping("/bookings/{bookingId}/messages")
    public ChatDtos.ChatMessageResponse send(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @Valid @RequestBody ChatDtos.SendMessageRequest request
    ) {
        return chatService.send(bookingId, principal.getUserId(), request);
    }
}

package com.fixcart.platform.chat;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.booking.BookingRequestEntity;
import com.fixcart.platform.booking.BookingRequestRepository;
import com.fixcart.platform.moderation.ContentModerationService;
import com.fixcart.platform.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final BookingRequestRepository bookingRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ContentModerationService contentModerationService;
    private final NotificationService notificationService;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            BookingRequestRepository bookingRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate,
            ContentModerationService contentModerationService,
            NotificationService notificationService
    ) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.contentModerationService = contentModerationService;
        this.notificationService = notificationService;
    }

    public ChatRoom ensureChatRoom(BookingRequestEntity booking) {
        return chatRoomRepository.findByBookingId(booking.getId())
                .orElseGet(() -> {
                    ChatRoom room = new ChatRoom();
                    room.setBooking(booking);
                    return chatRoomRepository.save(room);
                });
    }

    @Transactional(readOnly = true)
    public ChatDtos.ChatRoomResponse getRoom(UUID bookingId) {
        ChatRoom room = chatRoomRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Chat room not found"));
        return new ChatDtos.ChatRoomResponse(room.getId(), bookingId, messages(room.getId()));
    }

    public ChatDtos.ChatMessageResponse send(UUID bookingId, UUID senderId, ChatDtos.SendMessageRequest request) {
        BookingRequestEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        ChatRoom room = ensureChatRoom(booking);
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        ChatMessage message = new ChatMessage();
        message.setChatRoom(room);
        message.setSender(sender);
        message.setMessage(contentModerationService.sanitizeAndValidate(request.message(), "Chat message", 500));
        ChatMessage saved = chatMessageRepository.save(message);
        ChatDtos.ChatMessageResponse response = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/chat/" + bookingId, response);
        UUID recipientUserId = booking.getCustomer().getId().equals(senderId)
                ? (booking.getWorkerProfile() == null ? null : booking.getWorkerProfile().getUser().getId())
                : booking.getCustomer().getId();
        if (recipientUserId != null) {
            notificationService.sendToUser(
                    recipientUserId,
                    "New chat message",
                    sender.getFirstName() + ": " + saved.getMessage(),
                    Map.of("bookingId", bookingId.toString(), "type", "chat")
            );
        }
        return response;
    }

    private List<ChatDtos.ChatMessageResponse> messages(UUID roomId) {
        return chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ChatDtos.ChatMessageResponse toResponse(ChatMessage message) {
        return new ChatDtos.ChatMessageResponse(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getFirstName() + " " + message.getSender().getLastName(),
                message.getMessage(),
                message.getCreatedAt()
        );
    }
}

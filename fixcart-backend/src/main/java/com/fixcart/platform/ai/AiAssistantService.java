package com.fixcart.platform.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.auth.UserRole;
import com.fixcart.platform.booking.BookingRequestEntity;
import com.fixcart.platform.booking.BookingRequestRepository;
import com.fixcart.platform.category.CategoryCodeResolver;
import com.fixcart.platform.chat.ChatMessage;
import com.fixcart.platform.chat.ChatMessageRepository;
import com.fixcart.platform.chat.ChatRoomRepository;
import com.fixcart.platform.worker.WorkerProfile;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
@Transactional(readOnly = true)
public class AiAssistantService {

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final BookingRequestRepository bookingRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CategoryCodeResolver categoryCodeResolver;
    private final RestClient restClient;

    public AiAssistantService(
            AiProperties properties,
            ObjectMapper objectMapper,
            BookingRequestRepository bookingRepository,
            UserRepository userRepository,
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            CategoryCodeResolver categoryCodeResolver
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.categoryCodeResolver = categoryCodeResolver;
        this.restClient = RestClient.builder().baseUrl(properties.getBaseUrl()).build();
    }

    public AiDtos.JobImprovementResponse improveJobDescription(AiDtos.JobImprovementRequest request) {
        AiDtos.JobImprovementResponse fallback = fallbackJobImprovement(request);
        if (!properties.isEnabled()) {
            return fallback;
        }
        String prompt = "Improve this home-service job post for clarity and matching. Return JSON with keys title, description, checklist. "
                + "Category: " + normalizeCategory(request.categoryCode())
                + "\nTitle: " + request.title()
                + "\nDescription: " + request.description()
                + "\nAddress: " + safe(request.address())
                + "\nBudget: " + safe(request.budget())
                + "\nExpected hours: " + safe(request.expectedHours());
        try {
            JsonNode node = readJsonCompletion(prompt);
            String title = textOr(node, "title", fallback.title());
            String description = textOr(node, "description", fallback.description());
            List<String> checklist = arrayOr(node, "checklist", fallback.checklist());
            return new AiDtos.JobImprovementResponse(title, description, checklist, true);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    public AiDtos.QuoteSuggestionResponse suggestQuote(AiDtos.QuoteSuggestionRequest request) {
        AiDtos.QuoteSuggestionResponse fallback = fallbackQuote(request);
        if (!properties.isEnabled()) {
            return fallback;
        }
        String prompt = "Estimate a fair customer quote for a home service booking. Return JSON with keys suggestedBudget, lowEstimate, highEstimate, reasoning. "
                + "Category: " + normalizeCategory(request.categoryCode())
                + "\nTitle: " + request.title()
                + "\nDescription: " + request.description()
                + "\nExpected hours: " + request.expectedHours();
        try {
            JsonNode node = readJsonCompletion(prompt);
            return new AiDtos.QuoteSuggestionResponse(
                    decimalOr(node, "suggestedBudget", fallback.suggestedBudget()),
                    decimalOr(node, "lowEstimate", fallback.lowEstimate()),
                    decimalOr(node, "highEstimate", fallback.highEstimate()),
                    textOr(node, "reasoning", fallback.reasoning()),
                    true
            );
        } catch (Exception ignored) {
            return fallback;
        }
    }

    public String refineMatchExplanation(BookingRequestEntity booking, WorkerProfile worker, String fallbackExplanation) {
        if (!properties.isEnabled()) {
            return fallbackExplanation;
        }
        String prompt = "Rewrite this worker-job match explanation in one short customer-friendly sentence. Keep it factual. "
                + "\nBooking category: " + booking.getServiceCategory().getName()
                + "\nBooking title: " + booking.getTitle()
                + "\nBudget: " + safe(booking.getBudget())
                + "\nWorker name: " + worker.getUser().getFirstName() + " " + worker.getUser().getLastName()
                + "\nWorker category: " + (worker.getPrimaryCategory() == null ? "Unknown" : worker.getPrimaryCategory().getName())
                + "\nWorker rating: " + worker.getRating()
                + "\nWorker experience: " + worker.getExperienceYears()
                + "\nCurrent explanation: " + fallbackExplanation;
        try {
            return readTextCompletion(prompt, fallbackExplanation);
        } catch (Exception ignored) {
            return fallbackExplanation;
        }
    }

    public AiDtos.AssistantResponse answerBookingAssistant(UUID bookingId, UUID userId, String question) {
        BookingRequestEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        boolean canAccess = booking.getCustomer().getId().equals(userId)
                || (booking.getWorkerProfile() != null && booking.getWorkerProfile().getUser().getId().equals(userId))
                || user.getRole() == UserRole.ADMIN;
        if (!canAccess) {
            throw new IllegalStateException("You are not allowed to access this booking assistant");
        }
        AiDtos.AssistantResponse fallback = fallbackBookingAssistant(booking, question);
        if (!properties.isEnabled()) {
            return fallback;
        }
        String prompt = "You are a concise booking assistant for a local services marketplace. Answer the user's question briefly and helpfully. Return JSON with keys answer and quickTips."
                + "\nUser role: " + user.getRole().name()
                + "\nBooking title: " + booking.getTitle()
                + "\nCategory: " + booking.getServiceCategory().getName()
                + "\nStatus: " + booking.getStatus().name()
                + "\nBudget: " + safe(booking.getBudget())
                + "\nAddress: " + booking.getAddress()
                + "\nRecent chat:\n" + recentChatContext(bookingId)
                + "\nQuestion: " + question;
        try {
            JsonNode node = readJsonCompletion(prompt);
            return new AiDtos.AssistantResponse(
                    textOr(node, "answer", fallback.answer()),
                    arrayOr(node, "quickTips", fallback.quickTips()),
                    true
            );
        } catch (Exception ignored) {
            return fallback;
        }
    }

    public AiDtos.AssistantResponse answerSupport(UUID userId, String question) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        AiDtos.AssistantResponse fallback = fallbackSupport(user, question);
        if (!properties.isEnabled()) {
            return fallback;
        }
        String prompt = "You are a support assistant for a local worker marketplace app. Answer safely in a concise friendly way. Return JSON with keys answer and quickTips."
                + "\nUser role: " + user.getRole().name()
                + "\nQuestion: " + question;
        try {
            JsonNode node = readJsonCompletion(prompt);
            return new AiDtos.AssistantResponse(
                    textOr(node, "answer", fallback.answer()),
                    arrayOr(node, "quickTips", fallback.quickTips()),
                    true
            );
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private JsonNode readJsonCompletion(String prompt) throws Exception {
        String content = readTextCompletion(prompt + "\nRespond with valid JSON only.", null);
        return objectMapper.readTree(content);
    }

    private String readTextCompletion(String prompt, String fallback) {
        AiDtos.ChatCompletionRequest request = new AiDtos.ChatCompletionRequest(
                properties.getModel(),
                List.of(
                        new AiDtos.ChatCompletionRequest.Message("system", "You produce practical, safe, concise answers for FixCart. Avoid markdown."),
                        new AiDtos.ChatCompletionRequest.Message("user", prompt)
                ),
                properties.getTemperature(),
                properties.getMaxTokens()
        );
        AiDtos.ChatCompletionResponse response = restClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + properties.getApiKey())
                .body(request)
                .retrieve()
                .body(AiDtos.ChatCompletionResponse.class);
        if (response == null || response.choices() == null || response.choices().isEmpty() || response.choices().get(0).message() == null) {
            if (fallback != null) {
                return fallback;
            }
            throw new IllegalStateException("AI response unavailable");
        }
        String content = response.choices().get(0).message().content();
        return content == null || content.isBlank() ? fallback : content.trim();
    }

    private AiDtos.JobImprovementResponse fallbackJobImprovement(AiDtos.JobImprovementRequest request) {
        String title = request.title().trim();
        String description = request.description().trim();
        String improvedDescription = description;
        if (!description.endsWith(".")) {
            improvedDescription = description + ".";
        }
        improvedDescription += " Please bring the tools needed for " + normalizeCategory(request.categoryCode()).toLowerCase(Locale.ROOT) + " work and confirm the expected fix before starting.";
        List<String> checklist = List.of(
                "Confirm the exact issue on arrival",
                "Bring category-specific tools and common spare parts",
                "Share a clear time estimate before starting"
        );
        return new AiDtos.JobImprovementResponse(title, improvedDescription, checklist, false);
    }

    private AiDtos.QuoteSuggestionResponse fallbackQuote(AiDtos.QuoteSuggestionRequest request) {
        BigDecimal hourlyBase = switch (normalizeCategory(request.categoryCode())) {
            case "ELECTRICAL" -> new BigDecimal("500");
            case "CARPENTRY" -> new BigDecimal("550");
            case "PAINTING" -> new BigDecimal("450");
            case "CLEANING" -> new BigDecimal("300");
            case "GARDENING" -> new BigDecimal("350");
            case "HANDYMAN" -> new BigDecimal("400");
            case "APPLIANCE" -> new BigDecimal("600");
            default -> new BigDecimal("400");
        };
        BigDecimal hours = BigDecimal.valueOf(Math.max(1, request.expectedHours()));
        BigDecimal low = hourlyBase.multiply(hours).multiply(new BigDecimal("0.9")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal high = hourlyBase.multiply(hours).multiply(new BigDecimal("1.2")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal suggested = low.add(high).divide(new BigDecimal("2"), 0, RoundingMode.HALF_UP);
        return new AiDtos.QuoteSuggestionResponse(
                suggested,
                low,
                high,
                "Estimated from the service category, expected hours, and a conservative local-service pricing range.",
                false
        );
    }

    private AiDtos.AssistantResponse fallbackBookingAssistant(BookingRequestEntity booking, String question) {
        String answer = "This booking is currently " + booking.getStatus().name().replace('_', ' ').toLowerCase(Locale.ROOT)
                + ". You can use chat to confirm arrival time, materials, and the final scope before the work starts.";
        List<String> tips = List.of(
                "Confirm the arrival window in chat",
                "Recheck the address and phone details",
                "Use the status actions to keep both sides updated"
        );
        if (question.toLowerCase(Locale.ROOT).contains("budget")) {
            answer = "The current budget on this booking is Rs " + booking.getBudget().setScale(0, RoundingMode.HALF_UP)
                    + ". If the work scope changes, confirm the new amount clearly in chat before continuing.";
        }
        return new AiDtos.AssistantResponse(answer, tips, false);
    }

    private AiDtos.AssistantResponse fallbackSupport(User user, String question) {
        String lowered = question.toLowerCase(Locale.ROOT);
        String answer = "Please describe the issue clearly, and use the booking chat for job-specific coordination. If the problem is urgent, retry after refreshing the app.";
        if (lowered.contains("payment")) {
            answer = "Payments are optional in the current beta. Confirm the quote and payout details with the other party before starting the job.";
        } else if (lowered.contains("cancel")) {
            answer = "If you need to cancel, inform the other party in chat and avoid starting work until both sides agree on the change.";
        } else if (lowered.contains("worker") || lowered.contains("customer")) {
            answer = user.getRole() == UserRole.WORKER
                    ? "Keep your profile updated, respond quickly to open jobs, and use status updates so customers know where things stand."
                    : "Choose the category carefully, compare the worker recommendation and reviews, and confirm the quote in chat before work starts.";
        }
        return new AiDtos.AssistantResponse(answer, List.of("Refresh the dashboard if data looks stale", "Use chat for written confirmation", "Keep booking status updated"), false);
    }

    private String recentChatContext(UUID bookingId) {
        return chatRoomRepository.findByBookingId(bookingId)
                .map(room -> chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(room.getId()))
                .orElseGet(List::of)
                .stream()
                .skip(Math.max(0, sizeHint(bookingId) - 5))
                .map(this::chatLine)
                .reduce("", (left, right) -> left + right + "\n");
    }

    private long sizeHint(UUID bookingId) {
        return chatRoomRepository.findByBookingId(bookingId)
                .map(room -> chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(room.getId()).size())
                .orElse(0);
    }

    private String chatLine(ChatMessage message) {
        return message.getSender().getFirstName() + ": " + message.getMessage();
    }

    private String normalizeCategory(String rawCategory) {
        return categoryCodeResolver.normalize(rawCategory).replace('_', ' ');
    }

    private String textOr(JsonNode node, String field, String fallback) {
        JsonNode value = node.get(field);
        return value != null && value.isTextual() && !value.asText().isBlank() ? value.asText().trim() : fallback;
    }

    private List<String> arrayOr(JsonNode node, String field, List<String> fallback) {
        JsonNode value = node.get(field);
        if (value == null || !value.isArray()) {
            return fallback;
        }
        List<String> items = new ArrayList<>();
        value.forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) {
                items.add(item.asText().trim());
            }
        });
        return items.isEmpty() ? fallback : items;
    }

    private BigDecimal decimalOr(JsonNode node, String field, BigDecimal fallback) {
        JsonNode value = node.get(field);
        if (value == null) {
            return fallback;
        }
        try {
            return new BigDecimal(value.asText()).setScale(0, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String safe(Object value) {
        return value == null ? "N/A" : String.valueOf(value);
    }
}
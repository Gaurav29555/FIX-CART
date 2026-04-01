package com.fixcart.platform.ai;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiAssistantService aiAssistantService;

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/jobs/improve")
    public AiDtos.JobImprovementResponse improveJob(@Valid @RequestBody AiDtos.JobImprovementRequest request) {
        return aiAssistantService.improveJobDescription(request);
    }

    @PostMapping("/jobs/quote")
    public AiDtos.QuoteSuggestionResponse suggestQuote(@Valid @RequestBody AiDtos.QuoteSuggestionRequest request) {
        return aiAssistantService.suggestQuote(request);
    }

    @PostMapping("/bookings/{bookingId}/assistant")
    public AiDtos.AssistantResponse bookingAssistant(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @Valid @RequestBody AiDtos.AssistantRequest request
    ) {
        return aiAssistantService.answerBookingAssistant(bookingId, principal.getUserId(), request.question());
    }

    @PostMapping("/support")
    public AiDtos.AssistantResponse support(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @Valid @RequestBody AiDtos.AssistantRequest request
    ) {
        return aiAssistantService.answerSupport(principal.getUserId(), request.question());
    }
}
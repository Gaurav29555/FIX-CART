package com.fixcart.platform.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public class AiDtos {

    public record JobImprovementRequest(
            @NotBlank String categoryCode,
            @NotBlank String title,
            @NotBlank String description,
            String address,
            BigDecimal budget,
            Integer expectedHours
    ) {}

    public record JobImprovementResponse(
            String title,
            String description,
            List<String> checklist,
            boolean aiEnhanced
    ) {}

    public record QuoteSuggestionRequest(
            @NotBlank String categoryCode,
            @NotBlank String title,
            @NotBlank String description,
            @NotNull Integer expectedHours
    ) {}

    public record QuoteSuggestionResponse(
            BigDecimal suggestedBudget,
            BigDecimal lowEstimate,
            BigDecimal highEstimate,
            String reasoning,
            boolean aiEnhanced
    ) {}

    public record AssistantRequest(@NotBlank String question) {}

    public record AssistantResponse(
            String answer,
            List<String> quickTips,
            boolean aiEnhanced
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChatCompletionRequest(
            String model,
            List<Message> messages,
            double temperature,
            @JsonProperty("max_tokens") int maxTokens
    ) {
        public record Message(String role, String content) {}
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChatCompletionResponse(List<Choice> choices) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Choice(Message message) {}

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Message(String content) {}
    }
}
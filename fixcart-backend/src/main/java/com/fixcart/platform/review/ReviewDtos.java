package com.fixcart.platform.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class ReviewDtos {

    public record CreateReviewRequest(
            @Min(1) @Max(5) int rating,
            @NotBlank @Size(max = 1000) String comment
    ) {}

    public record ReviewResponse(
            UUID id,
            UUID bookingId,
            UUID workerId,
            UUID customerId,
            int rating,
            String comment,
            Instant createdAt
    ) {}
}

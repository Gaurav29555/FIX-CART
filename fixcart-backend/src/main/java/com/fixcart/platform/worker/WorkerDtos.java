package com.fixcart.platform.worker;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public class WorkerDtos {

    public record UpsertWorkerProfileRequest(
            @NotBlank String bio,
            @NotBlank String primaryCategoryCode,
            @NotNull @Min(0) @Max(60) Integer experienceYears,
            @NotNull BigDecimal basePrice,
            @NotNull BigDecimal hourlyRate,
            @NotNull Double latitude,
            @NotNull Double longitude,
            @NotNull Double serviceRadiusKm,
            boolean available,
            @Valid @NotEmpty List<AvailabilityRequest> availability
    ) {}

    public record AvailabilityRequest(
            @NotNull DayOfWeek dayOfWeek,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime
    ) {}

    public record WorkerCardResponse(
            UUID workerId,
            UUID userId,
            String name,
            String category,
            String bio,
            Integer experienceYears,
            BigDecimal basePrice,
            BigDecimal hourlyRate,
            Double rating,
            Integer totalReviews,
            Double latitude,
            Double longitude,
            Double distanceKm,
            Double serviceRadiusKm,
            boolean available,
            Double recommendationScore,
            String recommendationExplanation
    ) {}

    public record WorkerProfileResponse(
            WorkerCardResponse worker,
            List<AvailabilityView> availability
    ) {}

    public record AvailabilityView(
            UUID id,
            DayOfWeek dayOfWeek,
            LocalTime startTime,
            LocalTime endTime
    ) {}
}

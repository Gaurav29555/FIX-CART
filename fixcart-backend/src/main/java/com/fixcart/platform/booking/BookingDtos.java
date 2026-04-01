package com.fixcart.platform.booking;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class BookingDtos {

    public record CreateBookingRequest(
            @NotBlank String categoryCode,
            @NotBlank String title,
            @NotBlank String description,
            @NotNull BigDecimal budget,
            @NotNull @Min(1) Integer expectedDurationHours,
            @NotNull @Future Instant preferredTime,
            @NotBlank String address,
            @NotNull Double latitude,
            @NotNull Double longitude,
            @NotBlank String urgency
    ) {}

    public record UpdateStatusRequest(
            @NotNull BookingStatus status,
            String note
    ) {}

    public record BookingResponse(
            UUID bookingId,
            UUID customerId,
            UUID workerId,
            String customerName,
            String workerName,
            String category,
            String title,
            String description,
            BigDecimal budget,
            BigDecimal platformFee,
            BigDecimal workerPayout,
            Integer expectedDurationHours,
            Instant preferredTime,
            String address,
            Double latitude,
            Double longitude,
            String urgency,
            BookingStatus status,
            String matchExplanation,
            List<StatusHistoryItem> history
    ) {}

    public record StatusHistoryItem(
            UUID id,
            BookingStatus status,
            UUID updatedBy,
            String note,
            Instant createdAt
    ) {}
}


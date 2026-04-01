package com.fixcart.platform.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank String firstName,
            @NotBlank String lastName,
            @NotBlank @Pattern(regexp = "^[0-9]{10}$") String phone,
            @NotNull UserRole role,
            String bio,
            String serviceCategoryCode,
            Integer experienceYears,
            BigDecimal basePrice,
            BigDecimal hourlyRate,
            Double latitude,
            Double longitude,
            Double serviceRadiusKm
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record UserSummary(
            UUID id,
            String email,
            String firstName,
            String lastName,
            String phone,
            UserRole role
    ) {}

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            long expiresInSeconds,
            UserSummary user
    ) {}

    public record MeResponse(
            UserSummary user,
            WorkerSnapshot workerProfile
    ) {}

    public record WorkerSnapshot(
            UUID workerId,
            String bio,
            Integer experienceYears,
            BigDecimal basePrice,
            BigDecimal hourlyRate,
            Double rating,
            Integer totalReviews,
            Boolean available
    ) {}

    public record TokenValidationResponse(
            boolean valid,
            UUID userId,
            String email,
            UserRole role,
            Instant expiresAt
    ) {}
}

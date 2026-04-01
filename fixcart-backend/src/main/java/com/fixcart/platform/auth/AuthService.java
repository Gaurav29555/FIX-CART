package com.fixcart.platform.auth;

import com.fixcart.platform.worker.WorkerProfile;
import com.fixcart.platform.worker.WorkerService;
import jakarta.persistence.EntityNotFoundException;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final WorkerService workerService;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            WorkerService workerService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.workerService = workerService;
    }

    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }
        User user = new User();
        user.setEmail(request.email().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        user.setRole(request.role());
        User saved = userRepository.save(user);

        workerService.createStarterProfile(
                saved,
                request.serviceCategoryCode(),
                request.bio(),
                request.experienceYears(),
                request.basePrice(),
                request.hourlyRate(),
                request.latitude(),
                request.longitude(),
                request.serviceRadiusKm()
        );
        return issueTokens(saved);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return issueTokens(user);
    }

    public AuthDtos.AuthResponse refresh(AuthDtos.RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenAndRevokedFalse(request.refreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        if (refreshToken.getExpiresAt().isBefore(java.time.Instant.now())) {
            refreshToken.setRevoked(true);
            throw new IllegalArgumentException("Refresh token expired");
        }
        return issueTokens(refreshToken.getUser());
    }

    @Transactional(readOnly = true)
    public AuthDtos.MeResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        WorkerProfile worker = user.getRole() == UserRole.WORKER ? workerService.requireWorkerProfile(userId) : null;
        return new AuthDtos.MeResponse(toUserSummary(user), toWorkerSnapshot(worker));
    }

    @Transactional(readOnly = true)
    public AuthDtos.TokenValidationResponse validate(String token) {
        UUID userId = jwtService.extractUserId(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return new AuthDtos.TokenValidationResponse(true, userId, user.getEmail(), user.getRole(), jwtService.extractExpiry(token));
    }

    private AuthDtos.AuthResponse issueTokens(User user) {
        refreshTokenRepository.findByUserIdAndRevokedFalse(user.getId()).forEach(token -> token.setRevoked(true));

        String accessToken = jwtService.createAccessToken(user);
        String refreshTokenValue = jwtService.createRefreshToken(user);
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(refreshTokenValue);
        refreshToken.setExpiresAt(jwtService.extractExpiry(refreshTokenValue));
        refreshTokenRepository.save(refreshToken);

        return new AuthDtos.AuthResponse(
                accessToken,
                refreshTokenValue,
                jwtService.getAccessExpirationSeconds(),
                toUserSummary(user)
        );
    }

    private AuthDtos.UserSummary toUserSummary(User user) {
        return new AuthDtos.UserSummary(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole()
        );
    }

    private AuthDtos.WorkerSnapshot toWorkerSnapshot(WorkerProfile workerProfile) {
        if (workerProfile == null) {
            return null;
        }
        return new AuthDtos.WorkerSnapshot(
                workerProfile.getId(),
                workerProfile.getBio(),
                workerProfile.getExperienceYears(),
                workerProfile.getBasePrice(),
                workerProfile.getHourlyRate(),
                workerProfile.getRating(),
                workerProfile.getTotalReviews(),
                workerProfile.isAvailable()
        );
    }
}

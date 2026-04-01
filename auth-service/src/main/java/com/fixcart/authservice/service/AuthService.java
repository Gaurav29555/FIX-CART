package com.fixcart.authservice.service;

import com.fixcart.authservice.dto.*;
import com.fixcart.authservice.entity.User;
import com.fixcart.authservice.entity.Worker;
import com.fixcart.authservice.repository.UserRepository;
import com.fixcart.authservice.repository.WorkerRepository;
import com.fixcart.authservice.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private WorkerRepository workerRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    public ApiResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return new ApiResponse(400, "Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setRole(User.Role.valueOf(request.getRole()));
        
        User savedUser = userRepository.save(user);
        
        if (request.getRole().equals("WORKER")) {
            Worker worker = new Worker();
            worker.setUser(savedUser);
            worker.setServiceType(request.getServiceType());
            worker.setExperienceYears(request.getExperienceYears());
            worker.setHourlyRate(request.getHourlyRate());
            workerRepository.save(worker);
        }
        
        return new ApiResponse(201, "User registered successfully", savedUser.getId());
    }
    
    public AuthResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Invalid credentials");
        }
        
        User user = userOpt.get();
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        if (!user.isActive()) {
            throw new RuntimeException("Account is deactivated");
        }
        
        String accessToken = tokenProvider.generateAccessToken(
                user.getId().toString(), user.getEmail(), user.getRole().name());
        
        String refreshToken = tokenProvider.generateRefreshToken(user.getId().toString());
        
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                user.getId().toString(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name()
        );
        
        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                3600000L, // 1 hour
                userInfo
        );
    }
    
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }
        
        String userId = tokenProvider.getUserIdFromToken(refreshToken);
        
        User user = userRepository.findById(java.util.UUID.fromString(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        String accessToken = tokenProvider.generateAccessToken(
                user.getId().toString(), user.getEmail(), user.getRole().name());
        
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                user.getId().toString(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name()
        );
        
        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                3600000L, // 1 hour
                userInfo
        );
    }
    
    public ValidateTokenResponse validateToken(String token) {
        if (!tokenProvider.validateToken(token)) {
            return new ValidateTokenResponse(false, null, null, null);
        }
        
        String userId = tokenProvider.getUserIdFromToken(token);
        
        User user = userRepository.findById(java.util.UUID.fromString(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return new ValidateTokenResponse(true, userId, user.getEmail(), user.getRole().name());
    }
}

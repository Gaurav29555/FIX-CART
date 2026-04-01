package com.fixcart.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ValidateTokenResponse {
    private boolean valid;
    private String userId;
    private String email;
    private String role;
}

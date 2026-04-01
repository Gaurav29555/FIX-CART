package com.fixcart.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiResponse {
    private int status;
    private String message;
    private Object data;
    
    public ApiResponse(int status, String message) {
        this.status = status;
        this.message = message;
    }
}

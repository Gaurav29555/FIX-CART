package com.example.mobileapp.data.remote

import com.example.mobileapp.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface AuthService {
    
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse>
    
    @GET("auth/validate")
    suspend fun validateToken(@Query("token") token: String): Response<ValidateTokenResponse>
}

data class ValidateTokenResponse(
    @SerializedName("valid") val valid: Boolean,
    @SerializedName("userId") val userId: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("role") val role: String?
)

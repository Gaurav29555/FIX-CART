package com.example.mobileapp.data.repository

import com.example.mobileapp.data.model.*
import com.example.mobileapp.data.remote.AuthService
import com.example.mobileapp.utils.DataStoreManager
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authService: AuthService,
    private val dataStoreManager: DataStoreManager
) {
    
    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = authService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                response.body()?.let { loginResponse ->
                    dataStoreManager.saveAuthToken(loginResponse.accessToken)
                    dataStoreManager.saveUserData(loginResponse.user)
                    Result.success(loginResponse)
                } ?: Result.failure(Exception("Empty response"))
            } else {
                Result.failure(Exception("Login failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String,
        role: String,
        serviceType: String? = null,
        experienceYears: Int? = null,
        hourlyRate: Double? = null
    ): Result<ApiResponse> {
        return try {
            val request = RegisterRequest(
                email = email,
                password = password,
                firstName = firstName,
                lastName = lastName,
                phone = phone,
                role = role,
                serviceType = serviceType,
                experienceYears = experienceYears,
                hourlyRate = hourlyRate
            )
            
            val response = authService.register(request)
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Registration failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun logout() {
        dataStoreManager.clearAuthData()
    }
    
    suspend fun isUserLoggedIn(): Boolean {
        val token = dataStoreManager.authToken.first()
        return !token.isNullOrEmpty()
    }
    
    suspend fun getCurrentUser(): UserInfo? {
        return dataStoreManager.getUserData()
    }
}

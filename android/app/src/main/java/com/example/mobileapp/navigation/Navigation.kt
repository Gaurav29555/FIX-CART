package com.example.mobileapp.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.mobileapp.presentation.auth.AuthViewModel
import com.example.mobileapp.presentation.auth.LoginScreen
import com.example.mobileapp.presentation.auth.RegisterScreen
import com.example.mobileapp.presentation.home.HomeScreen

@Composable
fun FixCartNavigation() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val isUserLoggedIn by authViewModel.uiState.collectAsState().value.currentUser != null
    
    LaunchedEffect(Unit) {
        // Check if user is already logged in
        if (authViewModel.uiState.value.currentUser == null) {
            // Will be handled by the NavHost
        }
    }
    
    NavHost(
        navController = navController,
        startDestination = if (isUserLoggedIn) "home" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("home") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate("register")
                }
            )
        }
        
        composable("register") {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate("login") {
                        popUpTo("register") { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.navigate("login") {
                        popUpTo("register") { inclusive = true }
                    }
                }
            )
        }
        
        composable("home") {
            HomeScreen(
                onLogout = {
                    navController.navigate("login") {
                        popUpTo("home") { inclusive = true }
                    }
                }
            )
        }
    }
}

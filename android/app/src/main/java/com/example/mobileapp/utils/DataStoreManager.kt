package com.example.mobileapp.utils

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.mobileapp.data.model.UserInfo
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "fixcart_prefs")

@Singleton
class DataStoreManager @Inject constructor(
    private val context: Context,
    private val gson: Gson
) {
    
    companion object {
        private val AUTH_TOKEN = stringPreferencesKey("auth_token")
        private val USER_DATA = stringPreferencesKey("user_data")
    }
    
    val authToken: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[AUTH_TOKEN]
        }
    
    suspend fun saveAuthToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[AUTH_TOKEN] = token
        }
    }
    
    suspend fun saveUserData(user: UserInfo) {
        context.dataStore.edit { preferences ->
            preferences[USER_DATA] = gson.toJson(user)
        }
    }
    
    suspend fun getUserData(): UserInfo? {
        return context.dataStore.data
            .map { preferences ->
                preferences[USER_DATA]?.let { userJson ->
                    gson.fromJson(userJson, UserInfo::class.java)
                }
            }
            .firstOrNull()
    }
    
    suspend fun clearAuthData() {
        context.dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN)
            preferences.remove(USER_DATA)
        }
    }
}

private fun <T> Flow<T>.firstOrNull(): T? {
    return try {
        this.first()
    } catch (e: Exception) {
        null
    }
}

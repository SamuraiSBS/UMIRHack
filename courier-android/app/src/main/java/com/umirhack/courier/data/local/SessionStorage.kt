package com.umirhack.courier.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.umirhack.courier.data.remote.AuthResponseDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.dataStore by preferencesDataStore(name = "courier_session")

data class SessionState(
    val token: String? = null,
    val userId: String? = null,
    val userEmail: String? = null,
    val userName: String? = null,
    val userRole: String? = null,
    val apiBaseUrlOverride: String? = null,
) {
    val isAuthenticated: Boolean
        get() = !token.isNullOrBlank() && userRole == "COURIER"
}

class SessionStorage(private val context: Context) {
    private object Keys {
        val token = stringPreferencesKey("token")
        val userId = stringPreferencesKey("user_id")
        val userEmail = stringPreferencesKey("user_email")
        val userName = stringPreferencesKey("user_name")
        val userRole = stringPreferencesKey("user_role")
        val apiBaseUrl = stringPreferencesKey("api_base_url")
    }

    val session: Flow<SessionState> = context.dataStore.data
        .catch { exception ->
            if (exception is IOException) {
                emit(emptyPreferences())
            } else {
                throw exception
            }
        }
        .map(::toSessionState)

    suspend fun snapshot(): SessionState = session.first()

    suspend fun saveAuth(auth: AuthResponseDto) {
        context.dataStore.edit { prefs ->
            prefs[Keys.token] = auth.token
            prefs[Keys.userId] = auth.user.id
            prefs[Keys.userEmail] = auth.user.email
            prefs[Keys.userName] = auth.user.name.orEmpty()
            prefs[Keys.userRole] = auth.user.role
        }
    }

    suspend fun clearAuth() {
        context.dataStore.edit { prefs ->
            prefs.remove(Keys.token)
            prefs.remove(Keys.userId)
            prefs.remove(Keys.userEmail)
            prefs.remove(Keys.userName)
            prefs.remove(Keys.userRole)
        }
    }

    suspend fun saveApiBaseUrl(baseUrl: String?) {
        context.dataStore.edit { prefs ->
            if (baseUrl.isNullOrBlank()) {
                prefs.remove(Keys.apiBaseUrl)
            } else {
                prefs[Keys.apiBaseUrl] = baseUrl
            }
        }
    }

    private fun toSessionState(prefs: Preferences): SessionState {
        return SessionState(
            token = prefs[Keys.token],
            userId = prefs[Keys.userId],
            userEmail = prefs[Keys.userEmail],
            userName = prefs[Keys.userName].takeUnless { it.isNullOrBlank() },
            userRole = prefs[Keys.userRole],
            apiBaseUrlOverride = prefs[Keys.apiBaseUrl].takeUnless { it.isNullOrBlank() },
        )
    }
}

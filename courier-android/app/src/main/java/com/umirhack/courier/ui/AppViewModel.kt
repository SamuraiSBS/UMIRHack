package com.umirhack.courier.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.umirhack.courier.data.local.SessionState
import com.umirhack.courier.data.local.SessionStorage
import com.umirhack.courier.data.repository.CourierRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AppUiState(
    val loading: Boolean = true,
    val submitting: Boolean = false,
    val errorMessage: String? = null,
    val session: SessionState = SessionState(),
)

class AppViewModel(
    private val repository: CourierRepository,
    private val sessionStorage: SessionStorage,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            sessionStorage.session.collect { session ->
                _uiState.update {
                    it.copy(
                        loading = false,
                        session = session,
                    )
                }
            }
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Введите email и пароль.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(submitting = true, errorMessage = null) }
            runCatching { repository.login(email.trim(), password) }
                .onSuccess { auth ->
                    if (auth.user.role != "COURIER") {
                        repository.logout()
                        _uiState.update {
                            it.copy(
                                submitting = false,
                                errorMessage = "Этот аккаунт не относится к курьерам.",
                            )
                        }
                    } else {
                        _uiState.update { it.copy(submitting = false) }
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            submitting = false,
                            errorMessage = repository.toUserMessage(error),
                        )
                    }
                }
        }
    }

    fun register(name: String, email: String, password: String, deliveryZone: String) {
        when {
            email.isBlank() || password.isBlank() -> {
                _uiState.update { it.copy(errorMessage = "Введите email и пароль.") }
                return
            }
            password.length < 6 -> {
                _uiState.update { it.copy(errorMessage = "Пароль должен содержать минимум 6 символов.") }
                return
            }
        }

        viewModelScope.launch {
            _uiState.update { it.copy(submitting = true, errorMessage = null) }
            runCatching {
                repository.register(
                    name = name.trim(),
                    email = email.trim(),
                    password = password,
                    deliveryZone = deliveryZone.trim(),
                )
            }.onSuccess {
                _uiState.update { current -> current.copy(submitting = false) }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        submitting = false,
                        errorMessage = repository.toUserMessage(error),
                    )
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    companion object {
        fun factory(
            repository: CourierRepository,
            sessionStorage: SessionStorage,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return AppViewModel(repository, sessionStorage) as T
            }
        }
    }
}

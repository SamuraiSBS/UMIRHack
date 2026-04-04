package com.umirhack.courier.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.umirhack.courier.data.remote.OrderDto
import com.umirhack.courier.data.repository.CourierRepository
import com.umirhack.courier.util.isToday
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private val ACTIVE_STATUSES = setOf("ACCEPTED", "DELIVERING")

data class CourierUiState(
    val isLoading: Boolean = false,
    val isShiftUpdating: Boolean = false,
    val acceptingOrderId: String? = null,
    val isUpdatingActiveOrder: Boolean = false,
    val shiftActive: Boolean = false,
    val availableOrders: List<OrderDto> = emptyList(),
    val activeOrder: OrderDto? = null,
    val completedOrders: List<OrderDto> = emptyList(),
    val completedToday: List<OrderDto> = emptyList(),
    val errorMessage: String? = null,
)

class CourierViewModel(
    private val repository: CourierRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CourierUiState())
    val uiState: StateFlow<CourierUiState> = _uiState.asStateFlow()

    fun refresh(showLoader: Boolean = true) {
        viewModelScope.launch {
            if (showLoader) {
                _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            } else {
                _uiState.update { it.copy(errorMessage = null) }
            }

            runCatching {
                val shiftDeferred = async { repository.getShift() }
                val ordersDeferred = async { repository.getCourierOrders() }
                val shift = shiftDeferred.await()
                val orders = ordersDeferred.await()
                val available = if (shift.isActive) repository.getAvailableOrders() else emptyList()
                Triple(shift.isActive, orders, available)
            }.onSuccess { (shiftActive, orders, available) ->
                val activeOrder = orders.firstOrNull { it.status in ACTIVE_STATUSES }
                val completed = orders.filter { it.status == "DONE" }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        shiftActive = shiftActive,
                        availableOrders = available,
                        activeOrder = activeOrder,
                        completedOrders = completed,
                        completedToday = completed.filter { order -> isToday(order.createdAt) },
                        errorMessage = null,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = repository.toUserMessage(error),
                    )
                }
            }
        }
    }

    fun toggleShift() {
        viewModelScope.launch {
            val shouldStart = !_uiState.value.shiftActive
            _uiState.update { it.copy(isShiftUpdating = true, errorMessage = null) }

            runCatching {
                if (shouldStart) repository.startShift() else repository.stopShift()
            }.onSuccess {
                _uiState.update { it.copy(isShiftUpdating = false) }
                refresh(showLoader = false)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isShiftUpdating = false,
                        errorMessage = repository.toUserMessage(error),
                    )
                }
            }
        }
    }

    fun acceptOrder(orderId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(acceptingOrderId = orderId, errorMessage = null) }
            runCatching { repository.acceptOrder(orderId) }
                .onSuccess {
                    _uiState.update { it.copy(acceptingOrderId = null) }
                    refresh(showLoader = false)
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            acceptingOrderId = null,
                            errorMessage = repository.toUserMessage(error),
                        )
                    }
                    refresh(showLoader = false)
                }
        }
    }

    fun advanceActiveOrder(onCompleted: () -> Unit) {
        val order = _uiState.value.activeOrder ?: return
        val nextStatus = when (order.status) {
            "ACCEPTED" -> "DELIVERING"
            "DELIVERING" -> "DONE"
            else -> null
        } ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingActiveOrder = true, errorMessage = null) }
            runCatching { repository.updateOrderStatus(order.id, nextStatus) }
                .onSuccess {
                    _uiState.update { it.copy(isUpdatingActiveOrder = false) }
                    refresh(showLoader = false)
                    if (nextStatus == "DONE") {
                        onCompleted()
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isUpdatingActiveOrder = false,
                            errorMessage = repository.toUserMessage(error),
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    companion object {
        fun factory(repository: CourierRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return CourierViewModel(repository) as T
                }
            }
    }
}

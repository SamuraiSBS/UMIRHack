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

private fun OrderDto.mergeWithFallback(fallback: OrderDto): OrderDto =
    copy(
        address = address ?: fallback.address,
        distanceKm = distanceKm ?: fallback.distanceKm,
        deliveryFee = deliveryFee ?: fallback.deliveryFee,
        createdAt = createdAt ?: fallback.createdAt,
        items = items?.takeIf { it.isNotEmpty() } ?: fallback.items,
        business = business?.let { current ->
            val previous = fallback.business
            current.copy(
                id = current.id ?: previous?.id,
                name = current.name ?: previous?.name,
            )
        } ?: fallback.business,
        tradingPoint = tradingPoint?.let { current ->
            val previous = fallback.tradingPoint
            current.copy(
                name = current.name.ifBlank { previous?.name.orEmpty() },
                address = current.address.ifBlank { previous?.address.orEmpty() },
            )
        } ?: fallback.tradingPoint,
        customer = customer?.let { current ->
            val previous = fallback.customer
            current.copy(
                name = current.name ?: previous?.name,
                email = current.email ?: previous?.email,
            )
        } ?: fallback.customer,
    )

data class CourierUiState(
    val isLoading: Boolean = false,
    val isShiftUpdating: Boolean = false,
    val isCityUpdating: Boolean = false,
    val acceptingOrderId: String? = null,
    val isUpdatingActiveOrder: Boolean = false,
    val lastUpdatedAtMillis: Long? = null,
    val shiftActive: Boolean = false,
    val selectedCity: String = "Ростов-на-Дону",
    val availableOrders: List<OrderDto> = emptyList(),
    val activeOrder: OrderDto? = null,
    val recentCompletedOrder: OrderDto? = null,
    val completedOrders: List<OrderDto> = emptyList(),
    val completedToday: List<OrderDto> = emptyList(),
    val errorMessage: String? = null,
)

class CourierViewModel(
    private val repository: CourierRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CourierUiState())
    val uiState: StateFlow<CourierUiState> = _uiState.asStateFlow()

    fun refreshIfStale(maxAgeMillis: Long = 15_000L, showLoader: Boolean = false) {
        val lastUpdated = _uiState.value.lastUpdatedAtMillis
        val shouldRefresh = lastUpdated == null || System.currentTimeMillis() - lastUpdated > maxAgeMillis
        if (shouldRefresh) {
            refresh(showLoader = showLoader)
        }
    }

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
                Triple(shift, orders, available)
            }.onSuccess { (shift, orders, available) ->
                val activeOrder = orders.firstOrNull { it.status in ACTIVE_STATUSES }
                val completed = orders.filter { it.status == "DONE" }
                _uiState.update {
                    val recentCompletedOrder = if (activeOrder == null) it.recentCompletedOrder else null
                    it.copy(
                        isLoading = false,
                        shiftActive = shift.isActive,
                        selectedCity = shift.city ?: it.selectedCity,
                        availableOrders = available,
                        activeOrder = activeOrder,
                        recentCompletedOrder = recentCompletedOrder,
                        completedOrders = completed,
                        completedToday = completed.filter { order -> isToday(order.createdAt) },
                        lastUpdatedAtMillis = System.currentTimeMillis(),
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

    fun updateSelectedCity(city: String) {
        _uiState.update { it.copy(selectedCity = city) }
    }

    fun saveSelectedCity() {
        val city = _uiState.value.selectedCity.trim()
        if (city.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Выберите город") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isCityUpdating = true, errorMessage = null) }
            runCatching { repository.updateCourierCity(city) }
                .onSuccess { shift ->
                    _uiState.update {
                        it.copy(
                            isCityUpdating = false,
                            selectedCity = shift.city ?: city,
                        )
                    }
                    refresh(showLoader = false)
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isCityUpdating = false,
                            errorMessage = repository.toUserMessage(error),
                        )
                    }
                }
        }
    }

    fun toggleShift() {
        viewModelScope.launch {
            val shouldStart = !_uiState.value.shiftActive
            val city = _uiState.value.selectedCity.trim()
            if (shouldStart && city.isBlank()) {
                _uiState.update { it.copy(errorMessage = "Выберите город перед началом смены") }
                return@launch
            }
            _uiState.update { it.copy(isShiftUpdating = true, errorMessage = null) }

            runCatching {
                if (shouldStart) repository.startShift(city) else repository.stopShift()
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
                .onSuccess { acceptedOrder ->
                    _uiState.update {
                        it.copy(
                            acceptingOrderId = null,
                            activeOrder = acceptedOrder,
                            recentCompletedOrder = null,
                            availableOrders = it.availableOrders.filterNot { order -> order.id == orderId },
                            lastUpdatedAtMillis = System.currentTimeMillis(),
                        )
                    }
                    onSuccess()
                    refresh(showLoader = false)
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

    fun advanceActiveOrder() {
        val order = _uiState.value.activeOrder ?: return
        val nextStatus = when (order.status) {
            "ACCEPTED" -> "DELIVERING"
            "DELIVERING" -> "DONE"
            else -> null
        } ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingActiveOrder = true, errorMessage = null) }
            runCatching { repository.updateOrderStatus(order.id, nextStatus) }
                .onSuccess { updatedOrder ->
                    val resolvedOrder = updatedOrder.mergeWithFallback(order)
                    _uiState.update {
                        val updatedCompletedOrders = if (resolvedOrder.status == "DONE") {
                            listOf(resolvedOrder) + it.completedOrders.filterNot { completed -> completed.id == resolvedOrder.id }
                        } else {
                            it.completedOrders
                        }
                        val updatedCompletedToday = if (resolvedOrder.status == "DONE" && isToday(resolvedOrder.createdAt)) {
                            listOf(resolvedOrder) + it.completedToday.filterNot { completed -> completed.id == resolvedOrder.id }
                        } else {
                            it.completedToday
                        }
                        it.copy(
                            isUpdatingActiveOrder = false,
                            activeOrder = resolvedOrder.takeIf { current -> current.status in ACTIVE_STATUSES },
                            recentCompletedOrder = resolvedOrder.takeIf { current -> current.status == "DONE" },
                            completedOrders = updatedCompletedOrders,
                            completedToday = updatedCompletedToday,
                            lastUpdatedAtMillis = System.currentTimeMillis(),
                        )
                    }
                    refresh(showLoader = false)
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

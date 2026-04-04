package com.umirhack.courier.data.repository

import com.google.gson.Gson
import com.umirhack.courier.data.local.SessionStorage
import com.umirhack.courier.data.remote.ApiProvider
import com.umirhack.courier.data.remote.AuthResponseDto
import com.umirhack.courier.data.remote.ErrorResponseDto
import com.umirhack.courier.data.remote.LoginRequestDto
import com.umirhack.courier.data.remote.OrderDto
import com.umirhack.courier.data.remote.OrderStatusUpdateDto
import com.umirhack.courier.data.remote.RegisterRequestDto
import com.umirhack.courier.data.remote.ShiftStatusDto
import okhttp3.ResponseBody
import retrofit2.HttpException
import java.io.IOException

class CourierRepository(
    private val apiProvider: ApiProvider,
    private val sessionStorage: SessionStorage,
) {
    private val gson = Gson()

    suspend fun login(email: String, password: String): AuthResponseDto {
        val auth = apiProvider.api().login(LoginRequestDto(email, password))
        sessionStorage.saveAuth(auth)
        return auth
    }

    suspend fun register(
        email: String,
        password: String,
        name: String,
        deliveryZone: String,
    ): AuthResponseDto {
        val auth = apiProvider.api()
            .register(RegisterRequestDto(email, password, name, deliveryZone = deliveryZone))
        sessionStorage.saveAuth(auth)
        return auth
    }

    suspend fun logout() {
        sessionStorage.clearAuth()
    }

    suspend fun getShift(): ShiftStatusDto = apiProvider.api().getShift()

    suspend fun startShift(): ShiftStatusDto = apiProvider.api().startShift()

    suspend fun stopShift(): ShiftStatusDto = apiProvider.api().stopShift()

    suspend fun getCourierOrders(): List<OrderDto> = apiProvider.api().getCourierOrders()

    suspend fun getAvailableOrders(): List<OrderDto> = apiProvider.api().getAvailableOrders()

    suspend fun acceptOrder(orderId: String): OrderDto = apiProvider.api().acceptOrder(orderId)

    suspend fun updateOrderStatus(orderId: String, status: String): OrderDto {
        return apiProvider.api().updateOrderStatus(orderId, OrderStatusUpdateDto(status))
    }

    fun toUserMessage(error: Throwable): String {
        return when (error) {
            is HttpException -> error.response()?.errorBody().parseErrorMessage()
                ?: "Ошибка сервера (${error.code()})"
            is IOException -> "Не удалось подключиться к серверу. Проверьте сеть и доступность backend."
            else -> error.message ?: "Произошла неизвестная ошибка"
        }
    }

    private fun ResponseBody?.parseErrorMessage(): String? {
        val raw = this?.string().orEmpty()
        if (raw.isBlank()) return null
        return runCatching { gson.fromJson(raw, ErrorResponseDto::class.java).error }.getOrNull()
    }
}

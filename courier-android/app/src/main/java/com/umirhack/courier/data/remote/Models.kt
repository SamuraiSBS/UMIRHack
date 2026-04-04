package com.umirhack.courier.data.remote

data class LoginRequestDto(
    val email: String,
    val password: String,
)

data class RegisterRequestDto(
    val email: String,
    val password: String,
    val name: String,
    val role: String = "COURIER",
    val deliveryZone: String,
)

data class AuthResponseDto(
    val token: String,
    val user: UserDto,
)

data class UserDto(
    val id: String,
    val email: String,
    val name: String?,
    val role: String,
)

data class ShiftStatusDto(
    val isActive: Boolean,
)

data class OrderStatusUpdateDto(
    val status: String,
)

data class ErrorResponseDto(
    val error: String? = null,
)

data class BusinessDto(
    val id: String? = null,
    val name: String,
)

data class TradingPointDto(
    val name: String,
    val address: String,
)

data class ProductDto(
    val name: String,
    val price: Double? = null,
)

data class CustomerDto(
    val name: String? = null,
    val email: String? = null,
)

data class OrderItemDto(
    val id: String? = null,
    val quantity: Int,
    val product: ProductDto,
)

data class OrderDto(
    val id: String,
    val status: String,
    val address: String? = null,
    val totalPrice: Double,
    val distanceKm: Double? = null,
    val deliveryFee: Double? = null,
    val createdAt: String? = null,
    val items: List<OrderItemDto>,
    val business: BusinessDto,
    val tradingPoint: TradingPointDto? = null,
    val customer: CustomerDto? = null,
)

package com.umirhack.courier.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface CourierApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequestDto): AuthResponseDto

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequestDto): AuthResponseDto

    @GET("courier/shift")
    suspend fun getShift(): ShiftStatusDto

    @POST("courier/shift/start")
    suspend fun startShift(@Body body: ShiftStartRequestDto): ShiftStatusDto

    @POST("courier/shift/stop")
    suspend fun stopShift(): ShiftStatusDto

    @PATCH("courier/city")
    suspend fun updateCourierCity(@Body body: CourierCityRequestDto): ShiftStatusDto

    @GET("courier/orders")
    suspend fun getCourierOrders(): List<OrderDto>

    @GET("orders/available")
    suspend fun getAvailableOrders(): List<OrderDto>

    @POST("orders/{id}/accept")
    suspend fun acceptOrder(@Path("id") orderId: String): OrderDto

    @PATCH("orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: String,
        @Body body: OrderStatusUpdateDto,
    ): OrderDto
}

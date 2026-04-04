package com.umirhack.courier.data.remote

import com.umirhack.courier.BuildConfig
import com.umirhack.courier.data.local.SessionStorage
import kotlinx.coroutines.flow.first
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class ApiProvider(private val sessionStorage: SessionStorage) {
    suspend fun api(): CourierApi {
        val session = sessionStorage.session.first()
        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
            if (!session.token.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer ${session.token}")
            }
            chain.proceed(requestBuilder.build())
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC
                }
            )
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.DEFAULT_API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CourierApi::class.java)
    }
}

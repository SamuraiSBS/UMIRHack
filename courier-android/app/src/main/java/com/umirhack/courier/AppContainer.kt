package com.umirhack.courier

import android.content.Context
import com.umirhack.courier.data.local.SessionStorage
import com.umirhack.courier.data.remote.ApiProvider
import com.umirhack.courier.data.repository.CourierRepository

class AppContainer(context: Context) {
    val sessionStorage = SessionStorage(context)
    private val apiProvider = ApiProvider(sessionStorage)
    val repository = CourierRepository(apiProvider, sessionStorage)
}

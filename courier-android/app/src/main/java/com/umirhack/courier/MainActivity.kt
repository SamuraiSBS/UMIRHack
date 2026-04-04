package com.umirhack.courier

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.umirhack.courier.ui.AppViewModel
import com.umirhack.courier.ui.CourierApp
import com.umirhack.courier.ui.CourierViewModel
import com.umirhack.courier.ui.theme.UmirCourierTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as CourierApplication).container

        setContent {
            UmirCourierTheme {
                val appViewModel: AppViewModel = viewModel(
                    factory = AppViewModel.factory(container.repository, container.sessionStorage)
                )
                val courierViewModel: CourierViewModel = viewModel(
                    factory = CourierViewModel.factory(container.repository)
                )

                CourierApp(
                    appViewModel = appViewModel,
                    courierViewModel = courierViewModel,
                )
            }
        }
    }
}

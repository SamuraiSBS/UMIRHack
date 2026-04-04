package com.umirhack.courier.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.umirhack.courier.ui.CourierUiState
import com.umirhack.courier.ui.components.EmptyStateCard
import com.umirhack.courier.ui.components.ErrorCard
import com.umirhack.courier.ui.components.InfoChip
import com.umirhack.courier.ui.components.MerchantBanner
import com.umirhack.courier.ui.components.MetricRow
import com.umirhack.courier.ui.components.PromoHeroCard
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.components.appScreenBrush
import com.umirhack.courier.ui.theme.InfoSurface
import com.umirhack.courier.ui.theme.SuccessSurface
import com.umirhack.courier.ui.theme.WarningSurface
import com.umirhack.courier.util.money

private fun statusLabel(status: String): String = when (status) {
    "ACCEPTED" -> "Принят, едете к точке выдачи"
    "DELIVERING" -> "В пути к клиенту"
    "DONE" -> "Доставлен"
    else -> status
}

private fun nextActionLabel(status: String): String? = when (status) {
    "ACCEPTED" -> "Забрал заказ, везу клиенту"
    "DELIVERING" -> "Доставил заказ"
    else -> null
}

@Composable
fun ActiveOrderScreen(
    courierState: CourierUiState,
    onRefresh: () -> Unit,
    onRefreshIfStale: () -> Unit,
    onAdvanceOrder: () -> Unit,
    onOpenOrders: () -> Unit,
    onClearError: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefreshIfStale()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(appScreenBrush()),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            ScreenHeader(
                kicker = "Active Route",
                title = "Мой заказ",
                subtitle = "Текущий маршрут, клиентский адрес и следующий статус в одном экране.",
            )
        }

        courierState.errorMessage?.let { message ->
            item {
                ErrorCard(message = message, onDismiss = onClearError)
            }
        }

        val activeOrder = courierState.activeOrder
        if (activeOrder == null) {
            item {
                EmptyStateCard(
                    title = "Нет активного заказа",
                    message = "Когда вы примете заказ в ленте, здесь появится маршрут, состав и кнопка смены статуса.",
                    action = {
                        OutlinedButton(onClick = onOpenOrders) {
                            Text("Открыть доступные заказы")
                        }
                    },
                )
            }
        } else {
            item {
                PromoHeroCard(
                    badge = when (activeOrder.status) {
                        "ACCEPTED" -> "Pickup"
                        "DELIVERING" -> "Delivery"
                        else -> "Done"
                    },
                    title = statusLabel(activeOrder.status),
                    subtitle = "Переключение статусов идёт напрямую через серверный backend, без локального IP.",
                    accentColor = when (activeOrder.status) {
                        "ACCEPTED" -> MaterialTheme.colorScheme.primary
                        "DELIVERING" -> MaterialTheme.colorScheme.tertiary
                        else -> MaterialTheme.colorScheme.secondary
                    },
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        InfoChip(text = activeOrder.business.name)
                        activeOrder.deliveryFee?.let { fee ->
                            InfoChip(text = "+${money(fee)}")
                        }
                    }
                }
            }

            item {
                SectionCard(
                    containerColor = when (activeOrder.status) {
                        "ACCEPTED" -> InfoSurface
                        "DELIVERING" -> WarningSurface
                        else -> SuccessSurface
                    },
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
                ) {
                    MerchantBanner(
                        title = activeOrder.business.name,
                        subtitle = activeOrder.tradingPoint?.let { "${it.name} • ${it.address}" } ?: "Точка выдачи не указана",
                    )
                    MetricRow(label = "Клиент", value = activeOrder.customer?.name ?: activeOrder.customer?.email.orEmpty())
                    MetricRow(label = "Адрес доставки", value = activeOrder.address.orEmpty())
                    activeOrder.deliveryFee?.let { fee ->
                        MetricRow(
                            label = "Доход по доставке",
                            value = money(fee),
                            valueColor = MaterialTheme.colorScheme.secondary,
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    Text("Состав заказа", style = MaterialTheme.typography.titleMedium)
                    activeOrder.items.forEach { item ->
                        val sum = (item.product.price ?: 0.0) * item.quantity
                        MetricRow(
                            label = "${item.product.name} x${item.quantity}",
                            value = money(sum),
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    MetricRow(label = "Итого", value = money(activeOrder.totalPrice))
                    nextActionLabel(activeOrder.status)?.let { nextAction ->
                        Button(
                            onClick = onAdvanceOrder,
                            enabled = !courierState.isUpdatingActiveOrder,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                if (courierState.isUpdatingActiveOrder) "Обновляем..." else nextAction
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = onRefresh,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Обновить заказ")
                    }
                }
            }
        }

        if (courierState.completedToday.isNotEmpty()) {
            item {
                Text("Сегодня уже доставлено", style = MaterialTheme.typography.titleLarge)
            }
            items(courierState.completedToday, key = { it.id }) { order ->
                SectionCard {
                    MerchantBanner(
                        title = order.business.name,
                        subtitle = order.address.orEmpty(),
                    )
                    MetricRow(label = "Доход", value = money(order.deliveryFee))
                }
            }
        }
    }
}

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
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.components.appScreenBrush
import com.umirhack.courier.util.formatOrderCode
import com.umirhack.courier.util.money
import kotlinx.coroutines.delay

private fun etaLabel(distanceKm: Double?): String {
    if (distanceKm == null) return "Время уточняется"
    val minMinutes = maxOf(8, (distanceKm * 6).toInt())
    val maxMinutes = minMinutes + 8
    return "$minMinutes-$maxMinutes мин"
}

@Composable
fun AvailableOrdersScreen(
    courierState: CourierUiState,
    onRefresh: () -> Unit,
    onRefreshIfStale: () -> Unit,
    onAcceptOrder: (String) -> Unit,
    onClearError: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefreshIfStale()
        while (true) {
            delay(6_000)
            onRefresh()
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(appScreenBrush()),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                ScreenHeader(
                    kicker = "Orders Feed",
                    title = "Доступные заказы",
                    subtitle = "Лента обновляется каждые 6 секунд, но переключение вкладок теперь происходит без медленной анимации.",
                    modifier = Modifier.weight(1f),
                )
                OutlinedButton(onClick = onRefresh) {
                    Text("Обновить")
                }
            }
        }

        courierState.errorMessage?.let { message ->
            item {
                ErrorCard(message = message, onDismiss = onClearError)
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoChip(text = if (courierState.shiftActive) "Смена активна" else "Смена выключена")
                InfoChip(text = "${courierState.availableOrders.size} заказов")
            }
        }

        if (!courierState.shiftActive) {
            item {
                EmptyStateCard(
                    title = "Смена не активна",
                    message = "Запустите смену на главной вкладке, и здесь сразу откроется серверная лента заказов.",
                )
            }
        }

        if (courierState.shiftActive && courierState.availableOrders.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Пока нет доступных заказов",
                    message = "Приложение продолжит фоновое обновление. Как только заказ появится на сервере, карточка появится здесь.",
                )
            }
        }

        items(courierState.availableOrders, key = { it.id }) { order ->
            val itemCount = order.items.sumOf { it.quantity }
            val composition = buildString {
                order.items.take(3).forEachIndexed { index, item ->
                    append(item.product.name)
                    append(" x")
                    append(item.quantity)
                    if (index < minOf(order.items.size, 3) - 1) {
                        append(", ")
                    }
                }
                if (order.items.size > 3) {
                    append(" и ещё ")
                    append(order.items.size - 3)
                }
            }

            SectionCard {
                MerchantBanner(
                    title = order.business.name,
                    subtitle = order.tradingPoint?.let { "${it.name} • ${it.address}" } ?: "Точка выдачи уточняется",
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoChip(text = etaLabel(order.distanceKm))
                    InfoChip(text = "$itemCount поз.")
                    InfoChip(text = formatOrderCode(order.id))
                }

                MetricRow(
                    label = "Доход",
                    value = if (order.deliveryFee != null) "+${money(order.deliveryFee)}" else money(order.totalPrice),
                    valueColor = MaterialTheme.colorScheme.secondary,
                )
                MetricRow(label = "Чек клиента", value = money(order.totalPrice))

                Text(
                    text = "Куда везти: ${order.address.orEmpty()}",
                    color = MaterialTheme.colorScheme.onSurface,
                )
                order.distanceKm?.let { distance ->
                    Text(
                        text = "Маршрут: $distance км",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = composition,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )

                Button(
                    onClick = { onAcceptOrder(order.id) },
                    enabled = courierState.shiftActive && courierState.acceptingOrderId != order.id,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        if (courierState.acceptingOrderId == order.id) "Принимаем..." else "Принять заказ"
                    )
                }
            }
        }
    }
}

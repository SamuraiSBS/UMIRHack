package com.umirhack.courier.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
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
import com.umirhack.courier.ui.theme.SuccessSurface
import com.umirhack.courier.util.formatOrderCode
import com.umirhack.courier.util.money
import kotlinx.coroutines.delay

private fun etaLabel(distanceKm: Double?): String {
    if (distanceKm == null) return "Время уточняется"
    val minMinutes = maxOf(8, (distanceKm * 6).toInt())
    val maxMinutes = minMinutes + 8
    return "$minMinutes-$maxMinutes мин"
}

private fun orderActionLabel(
    orderId: String,
    activeOrderId: String?,
    shiftActive: Boolean,
    acceptingOrderId: String?,
): String {
    return when {
        activeOrderId == orderId -> "В работе"
        acceptingOrderId == orderId -> "Принимаем..."
        !shiftActive -> "Смена выключена"
        else -> "Принять заказ"
    }
}

@Composable
fun AvailableOrdersScreen(
    courierState: CourierUiState,
    onRefresh: () -> Unit,
    onAcceptOrder: (String) -> Unit,
    onClearError: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefresh()
        while (true) {
            delay(2_500)
            onRefresh()
        }
    }

    val mergedOrders = buildList {
        courierState.activeOrder?.let { add(it) }
        addAll(courierState.availableOrders.filterNot { order -> order.id == courierState.activeOrder?.id })
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(appScreenBrush())
            .statusBarsPadding(),
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
                InfoChip(text = "${mergedOrders.size} заказов")
            }
        }

        if (!courierState.shiftActive && courierState.activeOrder == null) {
            item {
                EmptyStateCard(
                    title = "Смена не активна",
                    message = "Экран доступен, но принять новый заказ можно только после запуска смены.",
                )
            }
        }

        if (mergedOrders.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Пока нет доступных заказов",
                    message = "Приложение продолжит фоновое обновление. Как только заказ появится на сервере, карточка появится здесь.",
                )
            }
        }

        items(mergedOrders, key = { it.id }) { order ->
            val orderItems = order.items.orEmpty()
            val merchantName = order.business?.name ?: "Магазин не указан"
            val itemCount = orderItems.sumOf { it.quantity }
            val composition = buildString {
                orderItems.take(3).forEachIndexed { index, item ->
                    append(item.product.name ?: "Товар")
                    append(" x")
                    append(item.quantity)
                    if (index < minOf(orderItems.size, 3) - 1) {
                        append(", ")
                    }
                }
                if (orderItems.size > 3) {
                    append(" и ещё ")
                    append(orderItems.size - 3)
                }
            }

            SectionCard {
                if (courierState.activeOrder?.id == order.id) {
                    AssistChip(
                        onClick = {},
                        enabled = false,
                        label = { Text("Заказ в работе") },
                        colors = AssistChipDefaults.assistChipColors(
                            disabledContainerColor = SuccessSurface,
                            disabledLabelColor = MaterialTheme.colorScheme.onSurface,
                        ),
                    )
                }

                MerchantBanner(
                    title = merchantName,
                    subtitle = order.tradingPoint?.let { "${it.name} • ${it.address}" } ?: "Точка выдачи уточняется",
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoChip(text = etaLabel(order.distanceKm))
                    InfoChip(text = "$itemCount поз.")
                    InfoChip(text = formatOrderCode(order.id))
                    if (courierState.activeOrder?.id == order.id) {
                        InfoChip(text = "В работе")
                    }
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
                    enabled = courierState.shiftActive &&
                        courierState.acceptingOrderId != order.id &&
                        courierState.activeOrder?.id != order.id,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(orderActionLabel(order.id, courierState.activeOrder?.id, courierState.shiftActive, courierState.acceptingOrderId))
                }
            }
        }
    }
}

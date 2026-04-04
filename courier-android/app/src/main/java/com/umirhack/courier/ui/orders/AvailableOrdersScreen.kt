package com.umirhack.courier.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.weight
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
import com.umirhack.courier.ui.components.MetricRow
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.util.formatOrderCode
import com.umirhack.courier.util.money
import kotlinx.coroutines.delay

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
            delay(8_000)
            onRefresh()
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                ScreenHeader(
                    title = "Доступные заказы",
                    subtitle = "Список обновляется каждые 8 секунд, как и на сайте.",
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

        if (!courierState.shiftActive) {
            item {
                EmptyStateCard(
                    title = "Смена не активна",
                    message = "Принятие заказов откроется после запуска смены на вкладке панели курьера.",
                )
            }
        }

        if (courierState.shiftActive && courierState.availableOrders.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Пока нет доступных заказов",
                    message = "Приложение продолжит автоматическое обновление. Как только заказ появится в базе, он отобразится здесь.",
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(order.business.name, style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = if (order.deliveryFee != null) "+${money(order.deliveryFee)}" else money(order.totalPrice),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }

                Text(
                    text = "$itemCount товар(ов) • ${money(order.totalPrice)}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "Откуда: ${order.tradingPoint?.let { "${it.name} — ${it.address}" } ?: order.business.name}",
                    color = MaterialTheme.colorScheme.onSurface,
                )
                order.distanceKm?.let { distance ->
                    Text(
                        text = "Расстояние: $distance км",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                MetricRow(label = "Заказ", value = formatOrderCode(order.id))
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
                        if (courierState.acceptingOrderId == order.id) "Принимаем..." else "Принять"
                    )
                }
            }
        }
    }
}

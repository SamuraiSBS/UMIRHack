package com.umirhack.courier.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
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
import com.umirhack.courier.ui.theme.SuccessSurface
import com.umirhack.courier.util.formatOrderDate
import com.umirhack.courier.util.money

@Composable
fun HistoryScreen(
    courierState: CourierUiState,
    onRefresh: () -> Unit,
    onClearError: () -> Unit,
) {
    val totalEarned = courierState.completedOrders.sumOf { it.deliveryFee ?: 0.0 }

    LaunchedEffect(Unit) {
        onRefresh()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenHeader(
                title = "История доставок",
                subtitle = "Все завершённые заказы курьера из базы данных.",
            )
        }

        courierState.errorMessage?.let { message ->
            item {
                ErrorCard(message = message, onDismiss = onClearError)
            }
        }

        item {
            SectionCard(
                containerColor = SuccessSurface,
                borderColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.18f),
            ) {
                MetricRow(label = "Всего доставок", value = courierState.completedOrders.size.toString())
                MetricRow(
                    label = "Заработано",
                    value = money(totalEarned),
                    valueColor = MaterialTheme.colorScheme.secondary,
                )
            }
        }

        if (courierState.completedOrders.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "История пока пустая",
                    message = "После первой завершённой доставки тут появятся все выполненные заказы.",
                )
            }
        }

        items(courierState.completedOrders, key = { it.id }) { order ->
            SectionCard {
                androidx.compose.material3.Text(
                    text = order.business.name,
                    style = MaterialTheme.typography.titleMedium,
                )
                androidx.compose.material3.Text(
                    text = order.address.orEmpty(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                order.tradingPoint?.let { tradingPoint ->
                    androidx.compose.material3.Text(
                        text = "Откуда: ${tradingPoint.address}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                MetricRow(label = "Дата", value = formatOrderDate(order.createdAt))
                MetricRow(label = "Заказ", value = money(order.totalPrice))
                MetricRow(
                    label = "Доход",
                    value = money(order.deliveryFee),
                    valueColor = MaterialTheme.colorScheme.secondary,
                )
            }
        }
    }
}

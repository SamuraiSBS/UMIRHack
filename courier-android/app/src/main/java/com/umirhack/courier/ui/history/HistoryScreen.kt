package com.umirhack.courier.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.umirhack.courier.ui.components.MerchantBanner
import com.umirhack.courier.ui.components.MetricRow
import com.umirhack.courier.ui.components.PromoHeroCard
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.components.appScreenBrush
import com.umirhack.courier.util.formatOrderDate
import com.umirhack.courier.util.money

@Composable
fun HistoryScreen(
    courierState: CourierUiState,
    onRefresh: () -> Unit,
    onRefreshIfStale: () -> Unit,
    onClearError: () -> Unit,
) {
    val totalEarned = courierState.completedOrders.sumOf { it.deliveryFee ?: 0.0 }

    LaunchedEffect(Unit) {
        onRefreshIfStale()
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
                    kicker = "History",
                    title = "История доставок",
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
            PromoHeroCard(
                badge = "${courierState.completedOrders.size} заказов",
                title = "Заработано ${money(totalEarned)}",
                subtitle = "Все завершённые доставки и начисления по ним собраны в одной ленте.",
                accentColor = MaterialTheme.colorScheme.secondary,
            )
        }

        if (courierState.completedOrders.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "История пока пустая",
                    message = "После первой завершённой доставки здесь появятся все выполненные заказы.",
                )
            }
        }

        items(courierState.completedOrders, key = { it.id }) { order ->
            SectionCard {
                MerchantBanner(
                    title = order.business?.name ?: "Магазин не указан",
                    subtitle = order.address.orEmpty(),
                )
                order.tradingPoint?.let { tradingPoint ->
                    Text(
                        text = "Точка выдачи: ${tradingPoint.address}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                MetricRow(label = "Дата", value = formatOrderDate(order.createdAt))
                MetricRow(label = "Чек", value = money(order.totalPrice))
                MetricRow(
                    label = "Доход",
                    value = money(order.deliveryFee),
                    valueColor = MaterialTheme.colorScheme.secondary,
                )
            }
        }
    }
}

package com.umirhack.courier.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
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
import com.umirhack.courier.ui.components.MetricRow
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.theme.InfoSurface
import com.umirhack.courier.ui.theme.SuccessSurface
import com.umirhack.courier.ui.theme.WarningSurface
import com.umirhack.courier.util.money

private fun statusLabel(status: String): String = when (status) {
    "ACCEPTED" -> "Принят — едете к точке выдачи"
    "DELIVERING" -> "В пути к клиенту"
    "DONE" -> "Доставлен"
    else -> status
}

private fun nextActionLabel(status: String): String? = when (status) {
    "ACCEPTED" -> "Забрал заказ — везу клиенту"
    "DELIVERING" -> "Доставил заказ"
    else -> null
}

@Composable
fun ActiveOrderScreen(
    courierState: CourierUiState,
    onRefresh: () -> Unit,
    onAdvanceOrder: () -> Unit,
    onOpenOrders: () -> Unit,
    onClearError: () -> Unit,
) {
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
                title = "Мой заказ",
                subtitle = "Здесь показан текущий активный заказ и следующие шаги доставки.",
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
                    message = "После принятия заказа здесь появятся адрес клиента, состав заказа и кнопка смены статуса.",
                    action = {
                        OutlinedButton(onClick = onOpenOrders) {
                            Text("Смотреть доступные заказы")
                        }
                    },
                )
            }
        } else {
            item {
                SectionCard(
                    containerColor = when (activeOrder.status) {
                        "ACCEPTED" -> InfoSurface
                        "DELIVERING" -> WarningSurface
                        else -> SuccessSurface
                    },
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                ) {
                    Text(
                        text = statusLabel(activeOrder.status),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            item {
                SectionCard {
                    Text(activeOrder.business.name, style = MaterialTheme.typography.titleLarge)
                    MetricRow(label = "Адрес доставки", value = activeOrder.address.orEmpty())
                    MetricRow(
                        label = "Клиент",
                        value = activeOrder.customer?.name ?: activeOrder.customer?.email.orEmpty(),
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
                    Text("Состав заказа", style = MaterialTheme.typography.titleMedium)
                    activeOrder.items.forEach { item ->
                        val sum = (item.product.price ?: 0.0) * item.quantity
                        MetricRow(
                            label = "${item.product.name} x${item.quantity}",
                            value = money(sum),
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
                    MetricRow(label = "Итого", value = money(activeOrder.totalPrice))
                    activeOrder.deliveryFee?.let { fee ->
                        MetricRow(
                            label = "Доход по доставке",
                            value = money(fee),
                            valueColor = MaterialTheme.colorScheme.secondary,
                        )
                    }
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
                }
            }
        }

        if (courierState.completedToday.isNotEmpty()) {
            item {
                Text("Сегодня уже доставлено", style = MaterialTheme.typography.titleMedium)
            }
            items(courierState.completedToday, key = { it.id }) { order ->
                SectionCard {
                    Text(order.business.name, style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = order.address.orEmpty(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    MetricRow(label = "Заработок", value = money(order.deliveryFee))
                }
            }
        }
    }
}

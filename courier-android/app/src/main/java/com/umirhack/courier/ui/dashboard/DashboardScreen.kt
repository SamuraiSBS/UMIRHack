package com.umirhack.courier.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.umirhack.courier.ui.AppUiState
import com.umirhack.courier.ui.CourierUiState
import com.umirhack.courier.ui.components.EmptyStateCard
import com.umirhack.courier.ui.components.ErrorCard
import com.umirhack.courier.ui.components.MetricRow
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.theme.InfoSurface
import com.umirhack.courier.ui.theme.SuccessSurface
import com.umirhack.courier.util.formatOrderCode
import com.umirhack.courier.util.money

private fun orderStatusLabel(status: String): String = when (status) {
    "ACCEPTED" -> "Принят"
    "DELIVERING" -> "В пути"
    "DONE" -> "Доставлен"
    else -> status
}

@Composable
fun DashboardScreen(
    appState: AppUiState,
    courierState: CourierUiState,
    onToggleShift: () -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onClearError: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefresh()
    }

    val greetingName = appState.session.userName ?: appState.session.userEmail.orEmpty()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenHeader(
                title = "Панель курьера",
                subtitle = "Привет, $greetingName. Здесь статус смены, активный заказ и сводка по доставкам.",
            )
        }

        val errorMessage = appState.errorMessage ?: courierState.errorMessage
        if (errorMessage != null) {
            item {
                ErrorCard(message = errorMessage, onDismiss = onClearError)
            }
        }

        item {
            SectionCard(
                containerColor = if (courierState.shiftActive) SuccessSurface else MaterialTheme.colorScheme.surface,
                borderColor = if (courierState.shiftActive) MaterialTheme.colorScheme.secondary.copy(alpha = 0.2f) else MaterialTheme.colorScheme.outline,
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(MaterialTheme.shapes.large)
                        .background(
                            if (courierState.shiftActive) {
                                MaterialTheme.colorScheme.secondary.copy(alpha = 0.14f)
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant
                            }
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (courierState.shiftActive) "ON" else "OFF",
                        style = MaterialTheme.typography.titleMedium,
                        color = if (courierState.shiftActive) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Text(
                    text = if (courierState.shiftActive) "Смена активна" else "Смена завершена",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = if (courierState.shiftActive) {
                        "Вы принимаете новые заказы и видите актуальные данные из базы через backend."
                    } else {
                        "Начните смену, чтобы получать доступные заказы и продолжать доставку."
                    },
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onToggleShift,
                        enabled = !courierState.isShiftUpdating,
                    ) {
                        Text(
                            if (courierState.isShiftUpdating) {
                                "Подождите..."
                            } else if (courierState.shiftActive) {
                                "Завершить смену"
                            } else {
                                "Начать смену"
                            }
                        )
                    }
                    OutlinedButton(
                        onClick = onRefresh,
                        enabled = !courierState.isLoading,
                    ) {
                        Text("Обновить")
                    }
                }
            }
        }

        courierState.activeOrder?.let { order ->
            item {
                SectionCard(
                    containerColor = InfoSurface,
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                ) {
                    Text("У вас активный заказ", style = MaterialTheme.typography.titleMedium)
                    Text(order.business.name, style = MaterialTheme.typography.titleLarge)
                    Text(
                        text = order.address.orEmpty(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    MetricRow(label = "Статус", value = orderStatusLabel(order.status))
                    MetricRow(label = "Код", value = formatOrderCode(order.id))
                    MetricRow(label = "Сумма", value = money(order.totalPrice))
                }
            }
        }

        item {
            SectionCard {
                Text("Сводка", style = MaterialTheme.typography.titleMedium)
                MetricRow(label = "Доступные заказы", value = courierState.availableOrders.size.toString())
                MetricRow(
                    label = "Активный заказ",
                    value = if (courierState.activeOrder != null) "Есть" else "Нет",
                )
                MetricRow(label = "Выполнено сегодня", value = courierState.completedToday.size.toString())
                MetricRow(label = "Всего доставок", value = courierState.completedOrders.size.toString())
            }
        }

        if (courierState.completedToday.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Сегодня пока пусто",
                    message = "После первой успешной доставки здесь появится краткая сводка по выполненным заказам за день.",
                )
            }
        } else {
            item {
                Text("Выполнено сегодня", style = MaterialTheme.typography.titleMedium)
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

        item {
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Выйти из аккаунта")
            }
        }

        item {
            Box(modifier = Modifier.height(4.dp))
        }
    }
}

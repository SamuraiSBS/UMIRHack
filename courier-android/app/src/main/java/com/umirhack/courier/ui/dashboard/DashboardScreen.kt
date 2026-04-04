package com.umirhack.courier.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.umirhack.courier.ui.AppUiState
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
    onRefreshIfStale: () -> Unit,
    onLogout: () -> Unit,
    onClearError: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefreshIfStale()
    }

    val greetingName = appState.session.userName ?: appState.session.userEmail.orEmpty()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(appScreenBrush())
            .statusBarsPadding(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            ScreenHeader(
                kicker = "Courier Hub",
                title = "На линии, $greetingName",
            )
        }

        item {
            PromoHeroCard(
                badge = if (courierState.shiftActive) "Смена ON" else "Смена OFF",
                title = if (courierState.shiftActive) "Забирайте новые заказы без пауз" else "Запустите смену и выходите на линию",
                subtitle = if (courierState.shiftActive) {
                    "Начинайте смену и зарабатывайте на работе вашей мечты!."
                } else {
                    "После запуска смены приложение откроет доступные заказы и начнёт держать ленту в актуальном состоянии."
                },
                accentColor = if (courierState.shiftActive) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoChip(
                        text = if (courierState.shiftActive) "Онлайн" else "Оффлайн",
                        containerColor = Color.Black.copy(alpha = 0.22f),
                        contentColor = MaterialTheme.colorScheme.onSurface,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onToggleShift,
                        enabled = !courierState.isShiftUpdating,
                    ) {
                        Text(
                            if (courierState.isShiftUpdating) {
                                "Обновляем..."
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

        val errorMessage = appState.errorMessage ?: courierState.errorMessage
        if (errorMessage != null) {
            item {
                ErrorCard(message = errorMessage, onDismiss = onClearError)
            }
        }

        item {
            SectionCard(
                containerColor = SuccessSurface,
                borderColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.22f),
            ) {
                Text("Пульс смены", style = MaterialTheme.typography.titleLarge)
                MetricRow(label = "Доступные заказы", value = courierState.availableOrders.size.toString())
                MetricRow(
                    label = "Активная доставка",
                    value = if (courierState.activeOrder != null) "Есть" else "Нет",
                )
                MetricRow(label = "Выполнено сегодня", value = courierState.completedToday.size.toString())
                MetricRow(label = "Всего доставок", value = courierState.completedOrders.size.toString())
            }
        }

        courierState.activeOrder?.let { order ->
            item {
                SectionCard {
                    MerchantBanner(
                        title = order.business.name,
                        subtitle = order.tradingPoint?.let { "${it.name} • ${it.address}" } ?: "Активный маршрут по заказу",
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        InfoChip(text = orderStatusLabel(order.status))
                        InfoChip(text = formatOrderCode(order.id))
                        InfoChip(text = money(order.totalPrice))
                    }
                    Text(
                        text = order.address.orEmpty(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        if (courierState.completedToday.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Сегодня пока пусто",
                    message = "После первой успешной доставки тут появится короткая лента завершённых заказов за день.",
                )
            }
        } else {
            item {
                Text("Сегодня закрыто", style = MaterialTheme.typography.titleLarge)
            }
            items(courierState.completedToday, key = { it.id }) { order ->
                SectionCard {
                    MerchantBanner(
                        title = order.business.name,
                        subtitle = order.address.orEmpty(),
                    )
                    MetricRow(label = "Доход", value = money(order.deliveryFee))
                    MetricRow(label = "Чек", value = money(order.totalPrice))
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

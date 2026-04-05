package com.umirhack.courier.ui.orders

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBarsPadding
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
import androidx.compose.ui.platform.LocalContext
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

private fun buildExternalRouteUri(
    originLat: Double,
    originLng: Double,
    destinationLat: Double,
    destinationLng: Double,
): Uri = Uri.parse(
    "https://www.google.com/maps/dir/?api=1" +
        "&origin=$originLat,$originLng" +
        "&destination=$destinationLat,$destinationLng" +
        "&travelmode=driving"
)

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

    val context = LocalContext.current
    val focusOrder = courierState.activeOrder ?: courierState.recentCompletedOrder
    val focusOrderItems = focusOrder?.items.orEmpty()
    val focusMerchantName = focusOrder?.business?.name ?: "Магазин не указан"

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
                kicker = "Active Route",
                title = "Мой заказ",
            )
        }

        courierState.errorMessage?.let { message ->
            item {
                ErrorCard(message = message, onDismiss = onClearError)
            }
        }

        if (focusOrder == null) {
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
                    badge = when (focusOrder.status) {
                        "ACCEPTED" -> "Pickup"
                        "DELIVERING" -> "Delivery"
                        else -> "Done"
                    },
                    title = statusLabel(focusOrder.status),
                    subtitle = if (focusOrder.status == "DONE") {
                        "Заказ завершён. Карточка остаётся на экране, чтобы вы сразу видели итог без возврата на главный экран."
                    } else {
                        "Следующий статус применяется сразу и отображается без ожидания полного обновления экрана."
                    },
                    accentColor = when (focusOrder.status) {
                        "ACCEPTED" -> MaterialTheme.colorScheme.primary
                        "DELIVERING" -> MaterialTheme.colorScheme.tertiary
                        else -> MaterialTheme.colorScheme.secondary
                    },
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        InfoChip(text = focusMerchantName)
                        focusOrder.deliveryFee?.let { fee ->
                            InfoChip(text = "+${money(fee)}")
                        }
                        if (focusOrder.status == "DONE") {
                            InfoChip(text = "Завершён")
                        }
                    }
                }
            }

            item {
                SectionCard(
                    containerColor = when (focusOrder.status) {
                        "ACCEPTED" -> InfoSurface
                        "DELIVERING" -> WarningSurface
                        else -> SuccessSurface
                    },
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
                ) {
                    MerchantBanner(
                        title = focusMerchantName,
                        subtitle = focusOrder.tradingPoint?.let { "${it.name} • ${it.address}" } ?: "Точка выдачи не указана",
                    )
                    MetricRow(label = "Клиент", value = focusOrder.customer?.name ?: focusOrder.customer?.email.orEmpty())
                    MetricRow(label = "Адрес доставки", value = focusOrder.address.orEmpty())
                    focusOrder.deliveryFee?.let { fee ->
                        MetricRow(
                            label = "Доход по доставке",
                            value = money(fee),
                            valueColor = MaterialTheme.colorScheme.secondary,
                        )
                    }
                    if (
                        focusOrder.tradingPoint?.lat != null &&
                        focusOrder.tradingPoint.lng != null &&
                        focusOrder.deliveryLat != null &&
                        focusOrder.deliveryLng != null
                    ) {
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(
                                    Intent.ACTION_VIEW,
                                    buildExternalRouteUri(
                                        originLat = focusOrder.tradingPoint.lat,
                                        originLng = focusOrder.tradingPoint.lng,
                                        destinationLat = focusOrder.deliveryLat,
                                        destinationLng = focusOrder.deliveryLng,
                                    ),
                                )
                                try {
                                    context.startActivity(intent)
                                } catch (e: ActivityNotFoundException) {
                                    Toast.makeText(
                                        context,
                                        "Не найдено приложение для открытия маршрута",
                                        Toast.LENGTH_SHORT,
                                    ).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Открыть маршрут на карте")
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    Text("Состав заказа", style = MaterialTheme.typography.titleMedium)
                    focusOrderItems.forEach { item ->
                        val sum = (item.product.price ?: 0.0) * item.quantity
                        MetricRow(
                            label = "${item.product.name ?: "Товар"} x${item.quantity}",
                            value = money(sum),
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    MetricRow(label = "Итого", value = money(focusOrder.totalPrice))
                    nextActionLabel(focusOrder.status)?.let { nextAction ->
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
                    if (focusOrder.status == "DONE") {
                        Button(
                            onClick = onOpenOrders,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Перейти к доступным заказам")
                        }
                    }
                    OutlinedButton(
                        onClick = onRefresh,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(if (focusOrder.status == "DONE") "Обновить историю" else "Обновить заказ")
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
                        title = order.business?.name ?: "Магазин не указан",
                        subtitle = order.address.orEmpty(),
                    )
                    MetricRow(label = "Доход", value = money(order.deliveryFee))
                }
            }
        }
    }
}

package com.umirhack.courier.util

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

fun money(value: Double?): String = "${(value ?: 0.0).toInt()} ₽"

fun formatOrderCode(orderId: String): String = "#${orderId.takeLast(6).uppercase(Locale.getDefault())}"

fun formatOrderDate(value: String?): String {
    if (value.isNullOrBlank()) return "Без даты"
    return runCatching {
        val date = OffsetDateTime.parse(value).atZoneSameInstant(ZoneId.systemDefault())
        date.format(DateTimeFormatter.ofPattern("d MMM, HH:mm", Locale("ru")))
    }.getOrElse { value }
}

fun isToday(value: String?): Boolean {
    if (value.isNullOrBlank()) return false
    return runCatching {
        val date = OffsetDateTime.parse(value).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate()
        date == LocalDate.now()
    }.getOrDefault(false)
}

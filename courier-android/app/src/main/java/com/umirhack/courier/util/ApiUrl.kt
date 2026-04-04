package com.umirhack.courier.util

import java.net.URI

fun normalizeApiBaseUrl(raw: String): String {
    val trimmed = raw.trim()
    require(trimmed.isNotBlank()) { "Введите адрес сервера." }

    val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        trimmed
    } else {
        "https://$trimmed"
    }

    val normalized = withScheme.trimEnd('/')
    return if (normalized.endsWith("/api")) {
        "$normalized/"
    } else {
        "$normalized/api/"
    }
}

fun formatApiHost(raw: String): String {
    return runCatching {
        URI(raw).host?.removePrefix("www.").orEmpty().ifBlank { raw }
    }.getOrDefault(raw)
}

fun isLocalApiUrl(raw: String): Boolean {
    val normalized = raw.lowercase()
    return normalized.contains("10.0.2.2") ||
        normalized.contains("127.0.0.1") ||
        normalized.contains("localhost") ||
        normalized.contains("192.168.")
}

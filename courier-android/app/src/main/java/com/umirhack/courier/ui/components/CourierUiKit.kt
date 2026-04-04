package com.umirhack.courier.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.umirhack.courier.ui.theme.AccentBlue
import com.umirhack.courier.ui.theme.AccentGreen
import com.umirhack.courier.ui.theme.AccentOrange
import com.umirhack.courier.ui.theme.AccentRed
import com.umirhack.courier.ui.theme.Background
import com.umirhack.courier.ui.theme.BackgroundTop
import com.umirhack.courier.ui.theme.Border
import com.umirhack.courier.ui.theme.DangerDark
import com.umirhack.courier.ui.theme.ErrorSurface
import com.umirhack.courier.ui.theme.PrimaryBlue
import com.umirhack.courier.ui.theme.SurfaceElevated
import com.umirhack.courier.ui.theme.TextMuted

data class MerchantPalette(
    val solid: Color,
    val soft: Color,
)

fun merchantPalette(seed: String): MerchantPalette {
    val palettes = listOf(
        MerchantPalette(AccentBlue, AccentBlue.copy(alpha = 0.18f)),
        MerchantPalette(AccentRed, AccentRed.copy(alpha = 0.18f)),
        MerchantPalette(PrimaryBlue, PrimaryBlue.copy(alpha = 0.18f)),
        MerchantPalette(AccentGreen, AccentGreen.copy(alpha = 0.18f)),
        MerchantPalette(AccentOrange, AccentOrange.copy(alpha = 0.18f)),
    )
    return palettes[kotlin.math.abs(seed.hashCode()) % palettes.size]
}

fun appScreenBrush(): Brush = Brush.verticalGradient(
    colors = listOf(BackgroundTop, Background, Background),
)

@Composable
fun SectionCard(
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface,
    borderColor: Color = Border,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = BorderStroke(1.dp, borderColor),
        shape = RoundedCornerShape(26.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = content,
        )
    }
}

@Composable
fun ScreenHeader(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    kicker: String? = null,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (kicker != null) {
            Text(
                text = kicker.uppercase(),
                color = PrimaryBlue,
                style = MaterialTheme.typography.labelLarge,
            )
        }
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        if (subtitle != null) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun PromoHeroCard(
    badge: String,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    accentColor: Color = PrimaryBlue,
    content: (@Composable ColumnScope.() -> Unit)? = null,
) {
    val secondary = accentColor.copy(alpha = 0.22f)
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.24f)),
        colors = CardDefaults.cardColors(containerColor = SurfaceElevated),
    ) {
        Column(
            modifier = Modifier
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(accentColor.copy(alpha = 0.28f), secondary, SurfaceElevated),
                    )
                )
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                color = accentColor,
                contentColor = Color.Black,
                shape = RoundedCornerShape(14.dp),
            ) {
                Text(
                    text = badge,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            content?.invoke(this)
        }
    }
}

@Composable
fun InfoChip(
    text: String,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surfaceVariant,
    contentColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = containerColor,
        contentColor = contentColor,
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
fun MetricRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            text = value,
            color = valueColor,
            style = MaterialTheme.typography.titleSmall,
        )
    }
}

@Composable
fun MerchantBanner(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    palette: MerchantPalette = merchantPalette(title),
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(palette.solid)
            .padding(horizontal = 16.dp, vertical = 18.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = Color.White,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.9f),
            )
        }
    }
}

@Composable
fun ErrorCard(
    message: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    SectionCard(
        modifier = modifier,
        containerColor = ErrorSurface,
        borderColor = MaterialTheme.colorScheme.error.copy(alpha = 0.2f),
    ) {
        Text(
            text = message,
            color = DangerDark,
            style = MaterialTheme.typography.bodyMedium,
        )
        OutlinedButton(onClick = onDismiss) {
            Text("Скрыть")
        }
    }
}

@Composable
fun InfoCard(
    message: String,
    modifier: Modifier = Modifier,
) {
    SectionCard(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surfaceVariant,
        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
    ) {
        Text(
            text = message,
            color = TextMuted,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
fun EmptyStateCard(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    SectionCard(modifier = modifier) {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        Text(
            text = message,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
        )
        action?.invoke()
    }
}

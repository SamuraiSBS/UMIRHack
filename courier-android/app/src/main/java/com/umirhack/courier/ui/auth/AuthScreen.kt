package com.umirhack.courier.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.umirhack.courier.ui.AppUiState
import com.umirhack.courier.ui.components.ErrorCard
import com.umirhack.courier.ui.components.InfoCard
import com.umirhack.courier.ui.components.InfoChip
import com.umirhack.courier.ui.components.PromoHeroCard
import com.umirhack.courier.ui.components.ScreenHeader
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.components.appScreenBrush
import com.umirhack.courier.util.formatApiHost
import com.umirhack.courier.util.isLocalApiUrl

private enum class AuthMode { LOGIN, REGISTER }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    appState: AppUiState,
    onLogin: (String, String) -> Unit,
    onRegister: (String, String, String, String) -> Unit,
    onSaveApiBaseUrl: (String) -> Unit,
    onResetApiBaseUrl: () -> Unit,
    onDismissError: () -> Unit,
) {
    var mode by rememberSaveable { mutableStateOf(AuthMode.LOGIN) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("courier@demo.com") }
    var password by rememberSaveable { mutableStateOf("demo123") }
    var deliveryZone by rememberSaveable { mutableStateOf("Центральный район") }
    var apiUrlDraft by rememberSaveable(appState.apiBaseUrl) { mutableStateOf(appState.apiBaseUrl) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(appScreenBrush())
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        PromoHeroCard(
            badge = "-400Р",
            title = "Курьерский кабинет в тёмном маркетплейс-стиле",
            subtitle = "Подключите серверный адрес, войдите в аккаунт и работайте с доставками без привязки к IP вашего ПК.",
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoChip(text = formatApiHost(appState.apiBaseUrl))
                InfoChip(text = "Быстрые вкладки")
            }
        }

        ScreenHeader(
            kicker = "Server",
            title = "Подключение к API",
            subtitle = "Поддерживается Render-домен или Netlify-домен с проксированием на backend.",
        )

        if (appState.infoMessage != null) {
            InfoCard(message = appState.infoMessage)
        }

        if (isLocalApiUrl(appState.apiBaseUrl)) {
            InfoCard(
                message = "Сейчас адрес указывает на локальную среду. Для реальных курьеров укажите публичный сервер.",
            )
        }

        appState.errorMessage?.let { message ->
            ErrorCard(
                message = message,
                onDismiss = onDismissError,
            )
        }

        SectionCard {
            OutlinedTextField(
                value = apiUrlDraft,
                onValueChange = { apiUrlDraft = it },
                label = { Text("API base URL") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Text(
                text = "Можно вставить `https://umirhack-teronit.netlify.app`, `https://umirhack-backend.onrender.com` или полный адрес с `/api`.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { onSaveApiBaseUrl(apiUrlDraft) },
                    enabled = !appState.savingApiUrl,
                ) {
                    Text(if (appState.savingApiUrl) "Сохраняем..." else "Сохранить сервер")
                }
                OutlinedButton(
                    onClick = onResetApiBaseUrl,
                    enabled = !appState.savingApiUrl,
                ) {
                    Text("Сбросить")
                }
            }
        }

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            SegmentedButton(
                selected = mode == AuthMode.LOGIN,
                onClick = {
                    mode = AuthMode.LOGIN
                    onDismissError()
                },
                shape = androidx.compose.material3.SegmentedButtonDefaults.itemShape(index = 0, count = 2),
            ) {
                Text("Вход")
            }
            SegmentedButton(
                selected = mode == AuthMode.REGISTER,
                onClick = {
                    mode = AuthMode.REGISTER
                    onDismissError()
                },
                shape = androidx.compose.material3.SegmentedButtonDefaults.itemShape(index = 1, count = 2),
            ) {
                Text("Регистрация")
            }
        }

        Box(modifier = Modifier.fillMaxWidth()) {
            SectionCard {
                Text(
                    text = if (mode == AuthMode.LOGIN) "Вход для курьера" else "Регистрация курьера",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = if (mode == AuthMode.LOGIN) {
                        "После входа откроются смена, лента заказов, активная доставка и история."
                    } else {
                        "Новый аккаунт будет создан в общей серверной базе данных."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                if (mode == AuthMode.REGISTER) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Имя") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Пароль") },
                    modifier = Modifier.fillMaxWidth(),
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                )

                if (mode == AuthMode.REGISTER) {
                    OutlinedTextField(
                        value = deliveryZone,
                        onValueChange = { deliveryZone = it },
                        label = { Text("Зона доставки") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }

                Button(
                    onClick = {
                        if (mode == AuthMode.LOGIN) {
                            onLogin(email, password)
                        } else {
                            onRegister(name, email, password, deliveryZone)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !appState.submitting,
                ) {
                    Text(
                        if (appState.submitting) "Подождите..." else if (mode == AuthMode.LOGIN) "Войти" else "Зарегистрироваться"
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
    }
}

package com.umirhack.courier.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
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
import com.umirhack.courier.ui.components.PromoHeroCard
import com.umirhack.courier.ui.components.SectionCard
import com.umirhack.courier.ui.components.appScreenBrush

private enum class AuthMode { LOGIN, REGISTER }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    appState: AppUiState,
    onLogin: (String, String) -> Unit,
    onRegister: (String, String, String, String) -> Unit,
    onDismissError: () -> Unit,
) {
    var mode by rememberSaveable { mutableStateOf(AuthMode.LOGIN) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("courier@demo.com") }
    var password by rememberSaveable { mutableStateOf("demo123") }
    var deliveryZone by rememberSaveable { mutableStateOf("Центральный район") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(appScreenBrush())
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        PromoHeroCard(
            title = "Кабинет курьера",
            subtitle = "Войдите в аккаунт и удобно работайте с доставками!",
        )

        appState.errorMessage?.let { message ->
            ErrorCard(
                message = message,
                onDismiss = onDismissError,
            )
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

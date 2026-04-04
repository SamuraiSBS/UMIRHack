package com.umirhack.courier.ui

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AssignmentTurnedIn
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.HomeWork
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.umirhack.courier.ui.auth.AuthScreen
import com.umirhack.courier.ui.dashboard.DashboardScreen
import com.umirhack.courier.ui.history.HistoryScreen
import com.umirhack.courier.ui.orders.ActiveOrderScreen
import com.umirhack.courier.ui.orders.AvailableOrdersScreen
import com.umirhack.courier.ui.theme.SurfaceMuted

private data class BottomDestination(
    val route: String,
    val label: String,
    val icon: @Composable () -> Unit,
)

private val bottomDestinations = listOf(
    BottomDestination("dashboard", "Панель", { Icon(Icons.Outlined.HomeWork, contentDescription = null) }),
    BottomDestination("available", "Заказы", { Icon(Icons.Outlined.LocalShipping, contentDescription = null) }),
    BottomDestination("active", "Мой заказ", { Icon(Icons.Outlined.DirectionsBike, contentDescription = null) }),
    BottomDestination("history", "История", { Icon(Icons.Outlined.AssignmentTurnedIn, contentDescription = null) }),
)

@Composable
fun CourierApp(
    appViewModel: AppViewModel,
    courierViewModel: CourierViewModel,
) {
    val appState by appViewModel.uiState.collectAsStateWithLifecycle()
    val courierState by courierViewModel.uiState.collectAsStateWithLifecycle()

    if (appState.loading) {
        Surface {
            Text(
                text = "Загрузка...",
                modifier = Modifier.padding(24.dp),
            )
        }
        return
    }

    if (!appState.session.isAuthenticated) {
        AuthScreen(
            appState = appState,
            onLogin = appViewModel::login,
            onRegister = appViewModel::register,
            onDismissError = appViewModel::clearError,
        )
        return
    }

    val navController = rememberNavController()

    LaunchedEffect(appState.session.userId) {
        courierViewModel.refresh()
    }

    Scaffold(
        containerColor = androidx.compose.material3.MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(
                containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                bottomDestinations.forEach { item ->
                    NavigationBarItem(
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = item.icon,
                        label = { Text(item.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                            selectedTextColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurface,
                            indicatorColor = SurfaceMuted,
                            unselectedIconColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "dashboard",
            enterTransition = { EnterTransition.None },
            exitTransition = { ExitTransition.None },
            popEnterTransition = { EnterTransition.None },
            popExitTransition = { ExitTransition.None },
            modifier = Modifier
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding),
        ) {
            composable("dashboard") {
                DashboardScreen(
                    appState = appState,
                    courierState = courierState,
                    onToggleShift = courierViewModel::toggleShift,
                    onCityChange = courierViewModel::updateSelectedCity,
                    onSaveCity = courierViewModel::saveSelectedCity,
                    onRefresh = { courierViewModel.refresh() },
                    onRefreshIfStale = { courierViewModel.refreshIfStale(showLoader = true) },
                    onLogout = appViewModel::logout,
                    onClearError = {
                        appViewModel.clearError()
                        courierViewModel.clearError()
                    },
                )
            }
            composable("available") {
                AvailableOrdersScreen(
                    courierState = courierState,
                    onRefresh = { courierViewModel.refresh(showLoader = false) },
                    onAcceptOrder = { orderId ->
                        courierViewModel.acceptOrder(orderId) {
                            navController.navigate("active") {
                                launchSingleTop = true
                            }
                        }
                    },
                    onClearError = courierViewModel::clearError,
                )
            }
            composable("active") {
                ActiveOrderScreen(
                    courierState = courierState,
                    onRefresh = { courierViewModel.refresh() },
                    onRefreshIfStale = { courierViewModel.refreshIfStale() },
                    onAdvanceOrder = { courierViewModel.advanceActiveOrder() },
                    onOpenOrders = {
                        navController.navigate("available") {
                            launchSingleTop = true
                        }
                    },
                    onClearError = courierViewModel::clearError,
                )
            }
            composable("history") {
                HistoryScreen(
                    courierState = courierState,
                    onRefresh = { courierViewModel.refresh() },
                    onRefreshIfStale = { courierViewModel.refreshIfStale() },
                    onClearError = courierViewModel::clearError,
                )
            }
        }
    }
}

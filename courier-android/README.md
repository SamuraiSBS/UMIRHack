# UMIR Courier Android

Нативное Android-приложение для курьеров на Kotlin + Jetpack Compose.

## Что реализовано

- Вход и регистрация курьера
- Хранение JWT и профиля через DataStore
- Единый production `API base URL`, зафиксированный на уровне сборки
- Запуск и завершение смены
- Список доступных заказов с автообновлением каждые 2.5 секунды
- Принятие заказа
- Активная доставка со сменой статусов `ACCEPTED -> DELIVERING -> DONE`
- История выполненных доставок и общий заработок
- Тёмный визуальный стиль экранов, приближенный к маркетплейс-интерфейсу из веб-референса

## Под какой backend

Приложение работает с текущим backend из этого репозитория:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/courier/shift`
- `POST /api/courier/shift/start`
- `POST /api/courier/shift/stop`
- `GET /api/courier/orders`
- `GET /api/orders/available`
- `POST /api/orders/:id/accept`
- `PATCH /api/orders/:id/status`

## Как тестировать

1. Поднимите backend из корня репозитория.
2. Откройте `courier-android` в Android Studio.
3. Дождитесь Gradle Sync.
4. При необходимости задайте backend URL в `courier-android/local.properties`:

```properties
courierApiBaseUrl=https://umirhack-backend.onrender.com/api/
```

5. Адрес backend уже зафиксирован в сборке, поэтому внутри приложения менять его не нужно.
6. Запустите `app` на устройстве или эмуляторе.

Демо-аккаунт из seed:

- `courier@demo.com / demo123`

## Сборка APK

После настройки Android SDK и Gradle wrapper:

```bash
./gradlew assembleDebug
```

APK появится в:

`app/build/outputs/apk/debug/app-debug.apk`

# UMIR Courier Android

Нативное Android-приложение для курьеров на Kotlin + Jetpack Compose.

## Что реализовано

- Вход и регистрация курьера
- Хранение JWT и профиля через DataStore
- Настраиваемый `API base URL`, который можно поменять прямо в приложении и сохранить для всех следующих запусков
- Запуск и завершение смены
- Список доступных заказов с автообновлением каждые 6 секунд
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

5. Для продового сценария удобнее не менять сборку, а открыть экран входа и указать публичный адрес сервера:

```text
https://umirhack-backend.onrender.com
```

или

```text
https://umirhack-teronit.netlify.app
```

Приложение само нормализует адрес до `.../api/` и сохранит его в DataStore.

6. Если используете Netlify как входную точку для мобильного приложения, убедитесь, что домен сайта проксирует `/api/*` на Render backend.
7. Запустите `app` на устройстве или эмуляторе.

Демо-аккаунт из seed:

- `courier@demo.com / demo123`

## Сборка APK

После настройки Android SDK и Gradle wrapper:

```bash
./gradlew assembleDebug
```

APK появится в:

`app/build/outputs/apk/debug/app-debug.apk`

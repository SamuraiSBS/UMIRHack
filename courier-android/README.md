# UMIR Courier Android

Нативное Android-приложение для курьеров на Kotlin + Jetpack Compose.

## Что реализовано

- Вход и регистрация курьера
- Хранение JWT и профиля через DataStore
- Единый `API base URL` на уровне сборки, без ввода IP в приложении
- Запуск и завершение смены
- Список доступных заказов с автообновлением каждые 8 секунд
- Принятие заказа
- Активная доставка со сменой статусов `ACCEPTED -> DELIVERING -> DONE`
- История выполненных доставок и общий заработок
- Визуальный стиль экранов приведён к курьерским страницам веб-сайта

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
courierApiBaseUrl=http://10.0.2.2:3001/api/
```

5. Для реального Android-устройства укажите здесь адрес backend, доступный с телефона в локальной сети, например `http://192.168.1.100:3001/api/`.
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

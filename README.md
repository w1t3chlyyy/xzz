# ⚡ 1337 — Telegram Mini App для фриланса

Фриланс биржа 1337 прямо в Telegram. Найди исполнителя или заказ за пару кликов.

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone https://github.com/yourusername/app-1337.git
cd app-1337
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

### 3. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. В SQL Editor выполните миграции из `supabase/migrations/` по порядку: `001`, `002`, `003`
3. Скопируйте URL и Anon/Service Role Key в `.env.local`

### 4. Настройка Telegram Bot

1. Напишите [@BotFather](https://t.me/BotFather)
2. Создайте нового бота и получите токен
3. Настройте Mini App через `/newapp`, укажите URL вашего деплоя
4. Зарегистрируйте вебхук бота (бот работает как serverless-роут, а не отдельный процесс):
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<ваш-домен>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
5. В чате с ботом (с аккаунта из `ADMIN_TELEGRAM_ID`) настройте цену и реквизиты:
   ```
   /setprices 990
   /setrequisites Сбербанк, карта .... получатель ...
   ```

### 5. Настройка CryptoBot

1. Откройте [@CryptoBot](https://t.me/CryptoBot)
2. Перейдите в Crypto Pay → Create App
3. Получите API Token → `CRYPTOBOT_API_TOKEN`
4. Настройте Webhook на `https://your-app.vercel.app/api/payments/webhook`

### 6. Деплой на Vercel

```bash
vercel --prod
```

## 📁 Структура проекта

```
fiolet/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Группа авторизации
│   │   └── onboarding/    # Выбор роли
│   ├── (main)/            # Основной интерфейс
│   │   ├── feed/          # Лента заказов/исполнителей
│   │   ├── orders/        # Заказы
│   │   └── profile/       # Профиль и подписки
│   └── api/               # API Routes
│       ├── auth/          # Авторизация
│       ├── payments/      # Платежи (create/webhook/status/promo)
│       └── telegram/      # Вебхук Telegram-бота
├── components/            # React компоненты
├── lib/                   # Утилиты и клиенты
├── supabase/             # Миграции
└── bot/                   # (опционально) локальный polling-бот для разработки
```

## 💳 Подписка и оплата

Один платный тариф — **Pro**. Три способа оплаты:

- **По реквизитам** — банковские данные редактируются командой `/setrequisites` в боте, пользователь переводит деньги и присылает чек боту, админ подтверждает вручную кнопкой.
- **Telegram Stars** — счёт выставляется прямо в чат с ботом, подписка активируется автоматически по апдейту `successful_payment`.
- **CryptoBot (USDT)** — подписка активируется автоматически по вебхуку `invoice_paid`.

Подписка нигде не выдаётся с клиента напрямую: колонки `subscription_tier`/`subscription_expires_at` физически недоступны для роли `authenticated` в базе — их может менять только сервер после реального подтверждения оплаты.

## 🎨 Дизайн

- **Primary**: `#7C3AED`
- **Background**: `#F4F3FA`
- **Accent**: `#8B5CF6`
- **Surface**: `#FFFFFF`

## 🔐 Безопасность

- Все таблицы защищены RLS
- Чувствительные колонки подписки закрыты от прямого изменения пользователем (REVOKE + триггер)
- Авторизация через Telegram initData
- Проверка подписи CryptoBot webhook
- Проверка секрета Telegram-вебхука (`TELEGRAM_WEBHOOK_SECRET`)
- Service Role Key только на сервере

## 📜 Лицензия

MIT

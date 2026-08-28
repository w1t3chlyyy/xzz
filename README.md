# 💜 Фиолет — Telegram Mini App для фриланса

Фриланс биржа прямо в Telegram. Найди исполнителя или заказ за пару кликов.

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone https://github.com/yourusername/fiolet.git
cd fiolet
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.local.example` в `.env.local` и заполните:

```bash
cp .env.local.example .env.local
```

### 3. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. В SQL Editor выполните миграцию из `supabase/migrations/001_initial_schema.sql`
3. Скопируйте URL и Anon Key в `.env.local`

### 4. Настройка Telegram Bot

1. Напишите [@BotFather](https://t.me/BotFather)
2. Создайте нового бота и получите токен
3. Настройте Mini App через `/newapp`
4. Укажите URL вашего Vercel-приложения

### 5. Настройка CryptoBot

1. Откройте [@CryptoBot](https://t.me/CryptoBot)
2. Перейдите в Crypto Pay → Create App
3. Получите API Token
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
│       ├── payments/      # Платежи
│       └── ai/            # AI-функции
├── components/            # React компоненты
├── lib/                   # Утилиты и клиенты
├── supabase/             # Миграции
└── bot/                   # Telegram бот
```

## 🎨 Дизайн

- **Primary**: `#7B2FBE`
- **Background**: `#1A0B2E`
- **Accent**: `#A855F7`
- **Surface**: `#2D1B4E`

## 🔐 Безопасность

- Все таблицы защищены RLS
- Авторизация через Telegram initData
- Проверка подписи CryptoBot webhook
- Service Role Key только на сервере

## 📜 Лицензия

MIT

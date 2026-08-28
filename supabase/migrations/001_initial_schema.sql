-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'executor', NULL)),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'ai_pro')),
  subscription_expires_at TIMESTAMPTZ,
  responses_today INTEGER DEFAULT 0,
  responses_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица заказов
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('programming', 'design', 'marketing', 'copywriting')),
  budget_min INTEGER,
  budget_max INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица откликов
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  executor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  ai_draft TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица платежей
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id BIGINT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'TON',
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'ai_pro')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица настроек
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  welcome_message TEXT DEFAULT 'Добро пожаловать в Фиолет!',
  pro_price INTEGER DEFAULT 990,
  ai_pro_price INTEGER DEFAULT 1990,
  admin_ids BIGINT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица профилей исполнителей
CREATE TABLE IF NOT EXISTS public.executor_profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}',
  bio TEXT,
  portfolio_url TEXT,
  rating DECIMAL(2,1) DEFAULT 5.0,
  completed_orders INTEGER DEFAULT 0
);

-- Вставляем начальные настройки
INSERT INTO public.settings (id, welcome_message, pro_price, ai_pro_price)
VALUES (1, '👋 Добро пожаловать в <b>Фиолет</b>!\n\n🎯 Фриланс биржа прямо в Telegram\n💼 Находите заказы и исполнителей\n⚡️ AI-помощник для откликов', 990, 1990)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Clients can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

-- Responses
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Executors can view own responses"
  ON public.responses FOR SELECT
  TO authenticated
  USING (executor_id = auth.uid());

CREATE POLICY "Clients can view responses to their orders"
  ON public.responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = responses.order_id
      AND orders.client_id = auth.uid()
    )
  );

CREATE POLICY "Executors can create responses"
  ON public.responses FOR INSERT
  TO authenticated
  WITH CHECK (executor_id = auth.uid());

CREATE POLICY "Clients can update response status"
  ON public.responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = responses.order_id
      AND orders.client_id = auth.uid()
    )
  );

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

-- Executor Profiles
ALTER TABLE public.executor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view executor profiles"
  ON public.executor_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Executors can update own profile"
  ON public.executor_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Executors can insert own profile"
  ON public.executor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Сброс ежедневных откликов
CREATE OR REPLACE FUNCTION reset_daily_responses()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET responses_today = 0,
      responses_reset_at = now()
  WHERE responses_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверка лимита откликов
CREATE OR REPLACE FUNCTION check_response_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier, responses_today, responses_reset_at
  INTO v_tier, v_count, v_reset_at
  FROM public.users
  WHERE id = p_user_id;

  IF v_tier IN ('pro', 'ai_pro') THEN
    RETURN true;
  END IF;

  IF v_reset_at < CURRENT_DATE THEN
    UPDATE public.users
    SET responses_today = 0, responses_reset_at = now()
    WHERE id = p_user_id;
    RETURN true;
  END IF;

  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для подсчёта откликов
CREATE OR REPLACE FUNCTION increment_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET responses_today = responses_today + 1
  WHERE id = NEW.executor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_response_created ON public.responses;
CREATE TRIGGER on_response_created
  AFTER INSERT ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_response_count();

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_orders_category ON public.orders(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_responses_order_id ON public.responses(order_id);
CREATE INDEX IF NOT EXISTS idx_responses_executor_id ON public.responses(executor_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

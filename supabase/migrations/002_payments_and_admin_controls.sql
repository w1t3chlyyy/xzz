-- ============================================
-- 1. ГЛАВНАЯ ДЫРА: пользователь мог сам выдать себе подписку
-- ============================================
-- Политика "Users can update own profile" разрешала UPDATE любых колонок
-- своей строки, включая subscription_tier / subscription_expires_at.
-- Любой авторизованный пользователь мог вызвать из браузера:
--   supabase.from('users').update({ subscription_tier: 'ai_pro', ... })
-- и получить платную подписку бесплатно.
--
-- Фикс в два слоя (defense in depth):

-- 1a. Забираем право обновлять чувствительные колонки у обычных пользователей.
--     Теперь их может менять только service_role (наши API-роуты и бот).
REVOKE UPDATE (subscription_tier, subscription_expires_at, responses_today, responses_reset_at)
  ON public.users FROM authenticated;

-- 1b. Триггер-страховка на случай, если где-то останется table-level grant,
--     перекрывающий пункт 1a.
CREATE OR REPLACE FUNCTION protect_subscription_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.responses_today := OLD.responses_today;
    NEW.responses_reset_at := OLD.responses_reset_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_subscription ON public.users;
CREATE TRIGGER trg_protect_subscription
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION protect_subscription_columns();

-- Триал теперь тоже считается от серверной колонки, а не от localStorage
-- (иначе очистка localStorage продлевала пробный период бесконечно).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT now();

-- ============================================
-- 2. Платежи: способ оплаты, срок действия, ручная проверка
-- ============================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
  ADD COLUMN IF NOT EXISTS method TEXT CHECK (method IN ('crypto', 'stars', 'bank')) DEFAULT 'crypto',
  ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS proof_file_id TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by BIGINT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'paid', 'rejected', 'expired'));

CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON public.payments(telegram_id);

-- ============================================
-- 3. Реквизиты для ручной оплаты — редактируются админом только через бота
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_requisites (
  id INTEGER PRIMARY KEY DEFAULT 1,
  details TEXT NOT NULL DEFAULT 'Реквизиты пока не заданы. Свяжитесь с администратором.',
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.payment_requisites (id, details)
VALUES (1, 'Реквизиты пока не заданы.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_requisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read requisites"
  ON public.payment_requisites FOR SELECT
  TO authenticated
  USING (true);
-- Намеренно нет политик INSERT/UPDATE/DELETE для authenticated —
-- менять реквизиты может только service_role (команда /setrequisites в боте).

-- ============================================
-- 4. Промокоды — проверяются и применяются только на сервере
-- ============================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'ai_pro')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
-- Тоже без политик для authenticated: читает/пишет только /api/payments/promo
-- через service_role, после проверки лимита использований.

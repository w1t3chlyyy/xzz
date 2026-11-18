-- ============================================
-- 5. Xrocket: новый способ оплаты
-- ============================================
-- invoice_id остаётся BIGINT (CryptoBot кладёт туда числовой invoice_id).
-- У xRocket id инвойса строковый ("inv_..."), поэтому — отдельная колонка.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check CHECK (method IN ('crypto', 'stars', 'bank', 'xrocket'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS xrocket_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_xrocket_invoice_id ON public.payments(xrocket_invoice_id);

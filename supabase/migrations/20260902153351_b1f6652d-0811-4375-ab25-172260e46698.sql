ALTER TABLE public.items DROP COLUMN IF EXISTS base_value_eur;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS synopsis text;

ALTER TABLE public.user_inventory DROP COLUMN IF EXISTS purchase_price_eur;
ALTER TABLE public.user_inventory DROP COLUMN IF EXISTS market_value_eur;
ALTER TABLE public.user_inventory DROP COLUMN IF EXISTS condition;

ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS format text;
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente';
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS rating smallint;

UPDATE public.user_inventory SET status = 'deseo' WHERE is_wishlist = true;
ALTER TABLE public.user_inventory DROP COLUMN IF EXISTS is_wishlist;

ALTER TABLE public.user_inventory
  ADD CONSTRAINT user_inventory_status_check
  CHECK (status IN ('completado', 'en_progreso', 'pendiente', 'deseo'));

ALTER TABLE public.user_inventory
  ADD CONSTRAINT user_inventory_rating_check
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
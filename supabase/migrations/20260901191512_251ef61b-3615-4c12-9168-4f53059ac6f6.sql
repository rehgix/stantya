CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('book','game','movie')),
  title TEXT NOT NULL,
  creator TEXT,
  release_year INTEGER,
  cover_url TEXT,
  platform TEXT,
  external_id TEXT,
  base_value_eur NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select_authenticated" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_insert_authenticated" ON public.items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "items_update_authenticated" ON public.items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items ON DELETE CASCADE,
  condition TEXT NOT NULL DEFAULT 'bueno' CHECK (condition IN ('nuevo','muy_bueno','bueno','aceptable')),
  purchase_price_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  market_value_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_wishlist BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_own_all" ON public.user_inventory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_inventory_user_id_idx ON public.user_inventory (user_id);
CREATE INDEX items_media_type_idx ON public.items (media_type);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_inventory_updated_at BEFORE UPDATE ON public.user_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
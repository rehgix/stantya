
CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfiles TO authenticated;
GRANT SELECT ON public.perfiles TO anon;
GRANT ALL ON public.perfiles TO service_role;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfiles_select_all" ON public.perfiles FOR SELECT USING (true);
CREATE POLICY "perfiles_insert_own" ON public.perfiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "perfiles_update_own" ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TYPE public.estado_juego AS ENUM ('jugando','completado','backlog','deseado');

CREATE TABLE public.juegos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  portada_url text,
  plataforma text,
  genero text,
  external_id text,
  estado public.estado_juego NOT NULL DEFAULT 'backlog',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.juegos TO authenticated;
GRANT SELECT ON public.juegos TO anon;
GRANT ALL ON public.juegos TO service_role;
ALTER TABLE public.juegos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "juegos_select_all" ON public.juegos FOR SELECT USING (true);
CREATE POLICY "juegos_write_own" ON public.juegos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX juegos_user_idx ON public.juegos(user_id);

CREATE TABLE public.entradas_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juego_id uuid NOT NULL REFERENCES public.juegos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto text NOT NULL,
  valoracion smallint CHECK (valoracion BETWEEN 1 AND 10),
  es_publica boolean NOT NULL DEFAULT true,
  imagen_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entradas_diario TO authenticated;
GRANT SELECT ON public.entradas_diario TO anon;
GRANT ALL ON public.entradas_diario TO service_role;
ALTER TABLE public.entradas_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entradas_select_publicas" ON public.entradas_diario FOR SELECT USING (es_publica = true);
CREATE POLICY "entradas_select_own" ON public.entradas_diario FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "entradas_write_own" ON public.entradas_diario FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX entradas_juego_idx ON public.entradas_diario(juego_id);
CREATE INDEX entradas_user_idx ON public.entradas_diario(user_id);

CREATE TABLE public.seguidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seguidor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seguido_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seguidor_id, seguido_id),
  CHECK (seguidor_id <> seguido_id)
);
GRANT SELECT, INSERT, DELETE ON public.seguidores TO authenticated;
GRANT SELECT ON public.seguidores TO anon;
GRANT ALL ON public.seguidores TO service_role;
ALTER TABLE public.seguidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seguidores_select_all" ON public.seguidores FOR SELECT USING (true);
CREATE POLICY "seguidores_write_own" ON public.seguidores FOR ALL TO authenticated USING (auth.uid() = seguidor_id) WITH CHECK (auth.uid() = seguidor_id);

CREATE TRIGGER perfiles_updated_at BEFORE UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER juegos_updated_at BEFORE UPDATE ON public.juegos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER entradas_updated_at BEFORE UPDATE ON public.entradas_diario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user_perfil()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (id, username)
  VALUES (NEW.id, split_part(COALESCE(NEW.email, 'gamer'), '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_perfil
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_perfil();

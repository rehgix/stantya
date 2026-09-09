CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS admins_manage_roles ON public.user_roles;
DROP POLICY IF EXISTS users_read_own_roles ON public.user_roles;

CREATE POLICY admins_manage_roles ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY users_read_own_roles ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

DROP POLICY IF EXISTS juegos_select_all ON public.juegos;
CREATE POLICY juegos_select_all ON public.juegos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS perfiles_select_all ON public.perfiles;
CREATE POLICY perfiles_select_all ON public.perfiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS seguidores_select_all ON public.seguidores;
CREATE POLICY seguidores_select_all ON public.seguidores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS entradas_select_publicas ON public.entradas_diario;
CREATE POLICY entradas_select_publicas ON public.entradas_diario
  FOR SELECT TO authenticated USING (es_publica = true);

REVOKE SELECT ON public.juegos FROM anon;
REVOKE SELECT ON public.perfiles FROM anon;
REVOKE SELECT ON public.seguidores FROM anon;
REVOKE SELECT ON public.entradas_diario FROM anon;

DROP POLICY IF EXISTS custom_covers_select_authenticated ON storage.objects;
CREATE POLICY custom_covers_select_authenticated ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'custom-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
ALTER TABLE public.juegos ADD COLUMN IF NOT EXISTS horas_jugadas integer;

ALTER TABLE public.juegos
  ADD CONSTRAINT juegos_horas_jugadas_check
  CHECK (horas_jugadas IS NULL OR horas_jugadas >= 0);

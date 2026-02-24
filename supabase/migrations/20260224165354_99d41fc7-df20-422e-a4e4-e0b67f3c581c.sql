-- Add broadcast_day column to animes table (0=Monday, 6=Sunday, null=not set)
ALTER TABLE public.animes ADD COLUMN broadcast_day smallint DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.animes.broadcast_day IS 'Day of the week the anime airs: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo';
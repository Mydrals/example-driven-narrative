-- Actualizar función para que la parte decimal represente SEGUNDOS, no fracción de minuto
-- Ejemplo: 21.40 = 21 minutos y 40 segundos (no 21.40 minutos)
CREATE OR REPLACE FUNCTION convert_minutes_to_seconds()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se proporciona skip_credits_time_minutes
  IF NEW.skip_credits_time_minutes IS NOT NULL THEN
    -- Separar la parte entera (minutos) y decimal (segundos)
    -- Ejemplo: 21.40 → 21 minutos * 60 + 40 segundos = 1300 segundos
    NEW.skip_credits_time := 
      FLOOR(NEW.skip_credits_time_minutes) * 60 + 
      ROUND((NEW.skip_credits_time_minutes - FLOOR(NEW.skip_credits_time_minutes)) * 100);
  END IF;
  
  -- Si se proporciona skip_credits_to_minutes
  IF NEW.skip_credits_to_minutes IS NOT NULL THEN
    -- Separar la parte entera (minutos) y decimal (segundos)
    NEW.skip_credits_to := 
      FLOOR(NEW.skip_credits_to_minutes) * 60 + 
      ROUND((NEW.skip_credits_to_minutes - FLOOR(NEW.skip_credits_to_minutes)) * 100);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Actualizar comentarios con el nuevo formato
COMMENT ON COLUMN episodes.skip_credits_time_minutes IS 'Formato MM.SS donde MM=minutos y SS=segundos. Ej: 21.40 = 21 minutos 40 segundos = 1300 segundos';
COMMENT ON COLUMN episodes.skip_credits_to_minutes IS 'Formato MM.SS donde MM=minutos y SS=segundos. Ej: 22.15 = 22 minutos 15 segundos = 1335 segundos';
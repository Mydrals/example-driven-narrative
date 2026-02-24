-- Actualizar función para fijar el search_path por seguridad
CREATE OR REPLACE FUNCTION convert_minutes_to_seconds()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se proporciona skip_credits_time_minutes, calcular skip_credits_time en segundos
  IF NEW.skip_credits_time_minutes IS NOT NULL THEN
    NEW.skip_credits_time := ROUND(NEW.skip_credits_time_minutes * 60);
  END IF;
  
  -- Si se proporciona skip_credits_to_minutes, calcular skip_credits_to en segundos
  IF NEW.skip_credits_to_minutes IS NOT NULL THEN
    NEW.skip_credits_to := ROUND(NEW.skip_credits_to_minutes * 60);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
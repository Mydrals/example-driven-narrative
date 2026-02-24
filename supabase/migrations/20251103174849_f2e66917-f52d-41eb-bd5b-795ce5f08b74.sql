-- Agregar columnas para entrada en minutos (formato decimal)
ALTER TABLE episodes 
ADD COLUMN IF NOT EXISTS skip_credits_time_minutes NUMERIC,
ADD COLUMN IF NOT EXISTS skip_credits_to_minutes NUMERIC;

-- Función para convertir minutos decimales a segundos
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
$$ LANGUAGE plpgsql;

-- Crear trigger para conversión automática
DROP TRIGGER IF EXISTS convert_skip_credits_minutes ON episodes;
CREATE TRIGGER convert_skip_credits_minutes
  BEFORE INSERT OR UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION convert_minutes_to_seconds();

-- Comentarios explicativos
COMMENT ON COLUMN episodes.skip_credits_time_minutes IS 'Tiempo en minutos (formato decimal, ej: 21.40 para 21 minutos 40 segundos) - se convierte automáticamente a segundos';
COMMENT ON COLUMN episodes.skip_credits_to_minutes IS 'Tiempo de destino en minutos (formato decimal) - se convierte automáticamente a segundos';
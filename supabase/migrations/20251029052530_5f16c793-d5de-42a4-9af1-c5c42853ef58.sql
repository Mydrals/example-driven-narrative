-- Create function to automatically populate anime_title from anime_id
CREATE OR REPLACE FUNCTION public.populate_anime_title()
RETURNS TRIGGER AS $$
BEGIN
  -- If anime_title is not provided or anime_id changed, get it from animes table
  IF (TG_OP = 'INSERT' AND NEW.anime_title IS NULL) OR 
     (TG_OP = 'UPDATE' AND (NEW.anime_id != OLD.anime_id OR NEW.anime_title IS NULL)) THEN
    
    SELECT title INTO NEW.anime_title
    FROM public.animes
    WHERE id = NEW.anime_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update on episodes
CREATE TRIGGER trigger_populate_anime_title
  BEFORE INSERT OR UPDATE ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_anime_title();
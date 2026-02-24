-- Add filename_pattern column to manga_chapters to store the detected pattern
ALTER TABLE manga_chapters 
ADD COLUMN filename_pattern text DEFAULT '000';

COMMENT ON COLUMN manga_chapters.filename_pattern IS 'Pattern for image filenames: "0" for 1.jpg, "00" for 01.jpg, "000" for 001.jpg, etc.';
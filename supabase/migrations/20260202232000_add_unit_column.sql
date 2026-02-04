-- Add unit column to tasks table
ALTER TABLE tasks ADD COLUMN unit text DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN tasks.unit IS 'Unit of measurement for the task amount (e.g. page, question, set)';

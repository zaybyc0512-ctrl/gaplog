-- Add gap analysis columns to tasks table

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS actual_time INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gap_score INTEGER DEFAULT NULL;

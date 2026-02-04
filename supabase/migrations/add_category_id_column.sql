-- Add category_id to tasks to allow overriding the Master's category
ALTER TABLE tasks ADD COLUMN category_id UUID REFERENCES categories(id);

-- Optional: Backfill existing tasks? 
-- For now, let's leave it null. If null, we fall back to master_id -> category.

-- Add context_id column to tasks table
ALTER TABLE tasks ADD COLUMN context_id UUID REFERENCES contexts(id) ON DELETE SET NULL;

-- Backfill context_id from categories
UPDATE tasks 
SET context_id = categories.context_id 
FROM categories 
WHERE tasks.category_id = categories.id;

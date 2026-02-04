-- Add draft column
alter table tasks add column is_draft boolean default false;

-- Add missing columns for logic (discovered during logic porting)
alter table tasks add column amount numeric; -- e.g. number of pages
alter table tasks add column actual_time integer; -- minutes

-- Update policies? Existing policies cover "tasks" table generally so new columns are covered.

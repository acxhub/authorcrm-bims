-- Add tag_type to tags for Status Tags vs Service Tags
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS tag_type TEXT NOT NULL DEFAULT 'status'
  CHECK (tag_type IN ('status', 'service'));

-- Backfill existing rows (default already applies to new rows)
UPDATE public.tags SET tag_type = 'status' WHERE tag_type IS NULL;

COMMENT ON COLUMN public.tags.tag_type IS 'Category: status (e.g. Not In Service) or service (e.g. product/service type)';

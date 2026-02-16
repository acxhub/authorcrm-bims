-- Allow same tag name for different tag_type (e.g. one status, one service)
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_name_key;
CREATE UNIQUE INDEX tags_name_tag_type_key ON public.tags (name, tag_type);

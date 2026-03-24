-- Optional book title (aligned with app: LeadForm + import no longer require it)
ALTER TABLE public.leads
  ALTER COLUMN book_title DROP NOT NULL;

COMMENT ON COLUMN public.leads.book_title IS 'Optional; may be NULL when not provided.';

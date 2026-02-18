-- Add pin-to-top columns for leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pinned_at timestamptz DEFAULT NULL;

-- Index for efficient pinned lead ordering
CREATE INDEX IF NOT EXISTS idx_leads_pinned ON public.leads (is_pinned DESC, pinned_at DESC NULLS LAST);

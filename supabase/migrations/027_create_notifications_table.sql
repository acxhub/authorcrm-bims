-- ============================================================
-- Migration 027: Create notifications table
-- In-app notification system for all CRM movements
-- ============================================================

-- Create the notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who receives this notification
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Who caused this notification (null for system-generated)
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Notification classification
  type TEXT NOT NULL,

  -- Human-readable content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Navigation context (click-to-navigate)
  entity_type TEXT,    -- 'lead' | 'deal' | 'user' | null
  entity_id UUID,

  -- Additional metadata (flexible JSON for type-specific data)
  metadata JSONB DEFAULT '{}',

  -- Read state
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For batch notifications (bulk actions)
  group_key TEXT
);

-- ============================================================
-- Indexes
-- ============================================================

-- Primary query: unread notifications for a user (badge count + unread list)
CREATE INDEX idx_notifications_recipient_unread
  ON public.notifications(recipient_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- Full notification list for a user (paginated)
CREATE INDEX idx_notifications_recipient_created
  ON public.notifications(recipient_id, created_at DESC);

-- Batch grouping lookup
CREATE INDEX idx_notifications_group_key
  ON public.notifications(group_key)
  WHERE group_key IS NOT NULL;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Any authenticated user can insert notifications (for any recipient)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- ============================================================
-- Enable real-time
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- 90-day cleanup function
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
$$;

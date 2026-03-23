-- Attendance: shifts, breaks, RLS (SELECT only for app users), SECURITY DEFINER RPCs for writes

CREATE TYPE public.attendance_shift_status AS ENUM ('active', 'on_break', 'clocked_out');

CREATE TABLE public.attendance_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  status public.attendance_shift_status NOT NULL DEFAULT 'active',
  total_break_seconds INTEGER NOT NULL DEFAULT 0 CHECK (total_break_seconds >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT attendance_shifts_clock_out_after_in CHECK (clock_out_at IS NULL OR clock_out_at >= clock_in_at)
);

CREATE UNIQUE INDEX attendance_shifts_one_open_per_user
  ON public.attendance_shifts (user_id)
  WHERE clock_out_at IS NULL;

CREATE INDEX idx_attendance_shifts_user_clock_in ON public.attendance_shifts (user_id, clock_in_at DESC);

CREATE TABLE public.attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.attendance_shifts(id) ON DELETE CASCADE,
  break_start_at TIMESTAMPTZ NOT NULL,
  break_end_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT attendance_breaks_end_after_start CHECK (break_end_at IS NULL OR break_end_at >= break_start_at)
);

CREATE UNIQUE INDEX attendance_breaks_one_open_per_shift
  ON public.attendance_breaks (shift_id)
  WHERE break_end_at IS NULL;

CREATE INDEX idx_attendance_breaks_shift ON public.attendance_breaks (shift_id);

CREATE TRIGGER update_attendance_shifts_updated_at
  BEFORE UPDATE ON public.attendance_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: reads only; writes via RPC (SECURITY DEFINER)
ALTER TABLE public.attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_shifts_select_own ON public.attendance_shifts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY attendance_shifts_select_manager ON public.attendance_shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leads_manager', 'sales_manager')
    )
  );

CREATE POLICY attendance_breaks_select_own ON public.attendance_breaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.attendance_shifts s
      WHERE s.id = attendance_breaks.shift_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY attendance_breaks_select_manager ON public.attendance_breaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leads_manager', 'sales_manager')
    )
  );

-- Clock in
CREATE OR REPLACE FUNCTION public.attendance_clock_in(p_at timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_active boolean;
  v_shift_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_active INTO v_active FROM public.profiles WHERE id = v_uid;
  IF v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_shifts
    WHERE user_id = v_uid AND clock_out_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Already clocked in';
  END IF;

  INSERT INTO public.attendance_shifts (user_id, clock_in_at, status)
  VALUES (v_uid, p_at, 'active')
  RETURNING id INTO v_shift_id;

  RETURN v_shift_id;
END;
$$;

-- Clock out (auto-ends open break at p_at)
CREATE OR REPLACE FUNCTION public.attendance_clock_out(p_shift_id uuid, p_at timestamptz DEFAULT now())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.attendance_shifts%ROWTYPE;
  b public.attendance_breaks%ROWTYPE;
  v_extra int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO r FROM public.attendance_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  IF r.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not your shift';
  END IF;
  IF r.clock_out_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already clocked out';
  END IF;

  SELECT * INTO b
  FROM public.attendance_breaks
  WHERE shift_id = p_shift_id AND break_end_at IS NULL
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_extra := GREATEST(0, EXTRACT(EPOCH FROM (p_at - b.break_start_at))::int);
    UPDATE public.attendance_breaks
    SET break_end_at = p_at, duration_seconds = v_extra
    WHERE id = b.id;
  END IF;

  UPDATE public.attendance_shifts
  SET
    clock_out_at = p_at,
    status = 'clocked_out'::public.attendance_shift_status,
    total_break_seconds = total_break_seconds + v_extra,
    updated_at = now()
  WHERE id = p_shift_id;
END;
$$;

-- Start break
CREATE OR REPLACE FUNCTION public.attendance_start_break(p_shift_id uuid, p_at timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.attendance_shifts%ROWTYPE;
  v_break_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO r FROM public.attendance_shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  IF r.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not your shift';
  END IF;
  IF r.clock_out_at IS NOT NULL THEN
    RAISE EXCEPTION 'Shift already ended';
  END IF;
  IF r.status <> 'active'::public.attendance_shift_status THEN
    RAISE EXCEPTION 'Cannot start break in current state';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_breaks
    WHERE shift_id = p_shift_id AND break_end_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Break already open';
  END IF;

  INSERT INTO public.attendance_breaks (shift_id, break_start_at)
  VALUES (p_shift_id, p_at)
  RETURNING id INTO v_break_id;

  UPDATE public.attendance_shifts
  SET status = 'on_break'::public.attendance_shift_status, updated_at = now()
  WHERE id = p_shift_id;

  RETURN v_break_id;
END;
$$;

-- End break
CREATE OR REPLACE FUNCTION public.attendance_end_break(p_break_id uuid, p_at timestamptz DEFAULT now())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  b public.attendance_breaks%ROWTYPE;
  r public.attendance_shifts%ROWTYPE;
  v_dur int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO b FROM public.attendance_breaks WHERE id = p_break_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Break not found';
  END IF;
  IF b.break_end_at IS NOT NULL THEN
    RAISE EXCEPTION 'Break already ended';
  END IF;

  SELECT * INTO r FROM public.attendance_shifts WHERE id = b.shift_id FOR UPDATE;
  IF r.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not your break';
  END IF;

  v_dur := GREATEST(0, EXTRACT(EPOCH FROM (p_at - b.break_start_at))::int);

  UPDATE public.attendance_breaks
  SET break_end_at = p_at, duration_seconds = v_dur
  WHERE id = p_break_id;

  UPDATE public.attendance_shifts
  SET
    total_break_seconds = total_break_seconds + v_dur,
    status = 'active'::public.attendance_shift_status,
    updated_at = now()
  WHERE id = r.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attendance_clock_in(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_clock_out(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_start_break(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_end_break(uuid, timestamptz) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_breaks;

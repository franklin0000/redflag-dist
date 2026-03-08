-- =============================================================================
-- Guardian Mode — guardian_sessions table
-- Run in Supabase SQL Editor → New Query → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.guardian_sessions (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  dater_id         uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token    text    UNIQUE NOT NULL,            -- public token for guardian URL
  dater_name       text    NOT NULL DEFAULT 'Unknown',
  date_location    text,                               -- optional venue text
  location         jsonb,                              -- { lat, lng, updatedAt }
  sentiment        text    NOT NULL DEFAULT 'normal',  -- 'normal' | 'tense' | 'alert'
  is_sos           boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  check_in_minutes int     NOT NULL DEFAULT 30,
  last_checkin_at  timestamptz DEFAULT now(),
  started_at       timestamptz DEFAULT now(),
  expires_at       timestamptz                         -- auto-set on insert
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.guardian_sessions ENABLE ROW LEVEL SECURITY;

-- Daters: full control over their own sessions
DROP POLICY IF EXISTS "Daters manage own sessions" ON public.guardian_sessions;
CREATE POLICY "Daters manage own sessions"
  ON public.guardian_sessions
  USING  (auth.uid() = dater_id)
  WITH CHECK (auth.uid() = dater_id);

-- Anyone (incl. anon): read active sessions — security is the unguessable token
DROP POLICY IF EXISTS "Public read active sessions" ON public.guardian_sessions;
CREATE POLICY "Public read active sessions"
  ON public.guardian_sessions FOR SELECT
  USING (is_active = true);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS guardian_sessions_token_idx
  ON public.guardian_sessions (session_token);

CREATE INDEX IF NOT EXISTS guardian_sessions_dater_idx
  ON public.guardian_sessions (dater_id, started_at DESC);

-- ── Enable Realtime on this table ─────────────────────────────────────────────
-- (Run this in the Supabase dashboard → Database → Replication, or uncomment here)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_sessions;

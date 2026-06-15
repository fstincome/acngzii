-- Phase 2: extend visitors table with American Corner member typology
DO $$ BEGIN
  CREATE TYPE public.member_type AS ENUM ('student','professional','entrepreneur','visitor','volunteer','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('active','inactive','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS member_type public.member_type NOT NULL DEFAULT 'visitor',
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS membership_status public.membership_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS membership_start_date date,
  ADD COLUMN IF NOT EXISTS membership_end_date date;

CREATE INDEX IF NOT EXISTS visitors_member_type_idx ON public.visitors(member_type);
CREATE INDEX IF NOT EXISTS visitors_membership_status_idx ON public.visitors(membership_status);
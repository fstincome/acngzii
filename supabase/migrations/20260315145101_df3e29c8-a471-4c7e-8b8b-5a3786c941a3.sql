
ALTER TABLE public.program_participants
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'other',
ADD COLUMN IF NOT EXISTS date_of_birth text,
ADD COLUMN IF NOT EXISTS neighborhood text DEFAULT '—',
ADD COLUMN IF NOT EXISTS occupation text DEFAULT '—';

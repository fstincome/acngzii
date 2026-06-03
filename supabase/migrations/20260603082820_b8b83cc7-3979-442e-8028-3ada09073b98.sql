
CREATE TABLE public.scholarship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL,
  form_number text,
  start_date date,
  age integer,
  project_title text,
  project_domain text,
  project_tools text,
  specific_objectives text[] DEFAULT '{}'::text[],
  presence_days text[] DEFAULT '{}'::text[],
  nb_days_per_week integer,
  expected_results text[] DEFAULT '{}'::text[],
  performance_indicators text[] DEFAULT '{}'::text[],
  sharing_link text,
  engagement_signed boolean DEFAULT false,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_applications TO anon;
GRANT ALL ON public.scholarship_applications TO service_role;

ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read scholarship_applications" ON public.scholarship_applications FOR SELECT USING (true);
CREATE POLICY "Allow public insert scholarship_applications" ON public.scholarship_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update scholarship_applications" ON public.scholarship_applications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete scholarship_applications" ON public.scholarship_applications FOR DELETE USING (true);

CREATE INDEX idx_scholarship_apps_participant ON public.scholarship_applications(participant_id);

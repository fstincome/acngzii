CREATE TABLE public.program_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL,
  program_id UUID NOT NULL,
  title TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  reporting_instructions TEXT,
  submission_link TEXT,
  status TEXT NOT NULL DEFAULT 'en_cours',
  submitted_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_tasks_participant ON public.program_tasks(participant_id);
CREATE INDEX idx_program_tasks_program ON public.program_tasks(program_id);

ALTER TABLE public.program_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read program_tasks"
ON public.program_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert program_tasks"
ON public.program_tasks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update program_tasks"
ON public.program_tasks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete program_tasks"
ON public.program_tasks FOR DELETE
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.update_program_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_program_tasks_updated_at
BEFORE UPDATE ON public.program_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_program_tasks_updated_at();
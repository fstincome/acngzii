
-- Programs table
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read programs" ON public.programs FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert programs" ON public.programs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update programs" ON public.programs FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete programs" ON public.programs FOR DELETE TO public USING (true);

-- Sub-programs table
CREATE TABLE public.sub_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read sub_programs" ON public.sub_programs FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert sub_programs" ON public.sub_programs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update sub_programs" ON public.sub_programs FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete sub_programs" ON public.sub_programs FOR DELETE TO public USING (true);

-- Program participants table
CREATE TABLE public.program_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  sub_program_id UUID REFERENCES public.sub_programs(id) ON DELETE SET NULL,
  participant_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'eleve',
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.program_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read program_participants" ON public.program_participants FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert program_participants" ON public.program_participants FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update program_participants" ON public.program_participants FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete program_participants" ON public.program_participants FOR DELETE TO public USING (true);

-- Program sessions (dates when participants should come)
CREATE TABLE public.program_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read program_sessions" ON public.program_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert program_sessions" ON public.program_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update program_sessions" ON public.program_sessions FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete program_sessions" ON public.program_sessions FOR DELETE TO public USING (true);

-- Program attendance tracking
CREATE TABLE public.program_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.program_participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.program_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'en_attente',
  marked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_id, session_id)
);

ALTER TABLE public.program_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read program_attendance" ON public.program_attendance FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert program_attendance" ON public.program_attendance FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update program_attendance" ON public.program_attendance FOR UPDATE TO public USING (true);

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_attendance;

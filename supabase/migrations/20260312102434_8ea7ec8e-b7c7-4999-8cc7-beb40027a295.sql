
-- Create visitors table
CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  neighborhood TEXT NOT NULL,
  occupation TEXT NOT NULL,
  photo TEXT,
  registration_date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create visits table
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
  room TEXT NOT NULL CHECK (room IN ('computer_lab', 'multipurpose_room')),
  action TEXT NOT NULL CHECK (action IN ('check_in', 'check_out')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_visits_visitor_id ON public.visits(visitor_id);
CREATE INDEX idx_visits_timestamp ON public.visits(timestamp);
CREATE INDEX idx_visitors_visitor_id ON public.visitors(visitor_id);

-- Enable RLS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth yet - will be tightened later)
CREATE POLICY "Allow public read visitors" ON public.visitors FOR SELECT USING (true);
CREATE POLICY "Allow public insert visitors" ON public.visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update visitors" ON public.visitors FOR UPDATE USING (true);

CREATE POLICY "Allow public read visits" ON public.visits FOR SELECT USING (true);
CREATE POLICY "Allow public insert visits" ON public.visits FOR INSERT WITH CHECK (true);

-- Enable realtime for visits (live occupancy updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;

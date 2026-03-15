-- Allow authenticated users to delete visitors (admin will control via UI)
CREATE POLICY "Allow authenticated delete visitors"
ON public.visitors
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete visits  
CREATE POLICY "Allow authenticated delete visits"
ON public.visits
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete program_attendance
CREATE POLICY "Allow authenticated delete program_attendance"
ON public.program_attendance
FOR DELETE
TO authenticated
USING (true);
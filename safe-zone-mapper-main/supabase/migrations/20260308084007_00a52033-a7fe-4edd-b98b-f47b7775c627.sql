
-- Fix permissive INSERT policy on accidents
DROP POLICY "Authenticated users can insert accidents" ON public.accidents;
CREATE POLICY "Authenticated users can insert own accidents" ON public.accidents 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = reported_by);


CREATE TABLE public.city_accident_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  population bigint DEFAULT 0,
  total_accidents integer DEFAULT 0,
  total_fatalities integer DEFAULT 0,
  total_injuries integer DEFAULT 0,
  accidents_per_lakh double precision DEFAULT 0,
  fatalities_per_lakh double precision DEFAULT 0,
  top_causes jsonb DEFAULT '[]'::jsonb,
  monthly_trend jsonb DEFAULT '[]'::jsonb,
  year integer NOT NULL DEFAULT 2024,
  source text DEFAULT 'MoRTH/NCRB',
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(city_name, state, year)
);

ALTER TABLE public.city_accident_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view city stats"
  ON public.city_accident_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert city stats"
  ON public.city_accident_stats FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update city stats"
  ON public.city_accident_stats FOR UPDATE
  TO service_role
  USING (true);

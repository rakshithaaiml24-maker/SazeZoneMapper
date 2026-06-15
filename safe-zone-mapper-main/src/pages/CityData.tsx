import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, MapPin, TrendingUp, Skull, AlertTriangle, Download, RefreshCw, Building2, Users, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

type CityStats = {
  id: string;
  city_name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  total_accidents: number;
  total_fatalities: number;
  total_injuries: number;
  accidents_per_lakh: number;
  fatalities_per_lakh: number;
  top_causes: string[];
  monthly_trend: { month: string; accidents: number }[];
  year: number;
  source: string;
  last_updated: string;
};

const STATES = [
  "All States", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman & Nicobar"
];

const CHART_COLORS = [
  'hsl(20, 90%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(142, 70%, 40%)',
  'hsl(0, 84%, 60%)', 'hsl(220, 70%, 50%)', 'hsl(280, 60%, 50%)',
];

export default function CityData() {
  const [cities, setCities] = useState<CityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All States');
  const [sortBy, setSortBy] = useState<'accidents' | 'fatalities' | 'rate'>('accidents');
  const [selectedCity, setSelectedCity] = useState<CityStats | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState('');

  useEffect(() => {
    loadCities();
  }, []);

  async function loadCities() {
    setLoading(true);
    const { data, error } = await supabase
      .from('city_accident_stats')
      .select('*')
      .order('total_accidents', { ascending: false });

    if (error) {
      toast.error('Failed to load city data');
      console.error(error);
    } else {
      setCities((data || []) as unknown as CityStats[]);
    }
    setLoading(false);
  }

  async function fetchAllCityData() {
    setFetching(true);
    let batchStart = 0;
    const batchSize = 10;

    try {
      while (true) {
        setFetchProgress(`Processing cities ${batchStart + 1} to ${batchStart + batchSize}...`);
        
        const { data, error } = await supabase.functions.invoke('scrape-city-data', {
          body: { batch_start: batchStart, batch_size: batchSize },
        });

        if (error) {
          toast.error(`Batch failed: ${error.message}`);
          break;
        }

        toast.success(`Processed ${data.processed} cities`);

        if (data.next_batch === null) {
          toast.success('All cities processed!');
          break;
        }

        batchStart = data.next_batch;
        // Small delay between batches
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch data');
    }

    setFetchProgress('');
    setFetching(false);
    loadCities();
  }

  const filtered = cities
    .filter(c => {
      const matchSearch = c.city_name.toLowerCase().includes(search.toLowerCase()) ||
        c.state.toLowerCase().includes(search.toLowerCase());
      const matchState = stateFilter === 'All States' || c.state === stateFilter;
      return matchSearch && matchState;
    })
    .sort((a, b) => {
      if (sortBy === 'accidents') return b.total_accidents - a.total_accidents;
      if (sortBy === 'fatalities') return b.total_fatalities - a.total_fatalities;
      return b.accidents_per_lakh - a.accidents_per_lakh;
    });

  const totalAccidents = filtered.reduce((s, c) => s + c.total_accidents, 0);
  const totalFatalities = filtered.reduce((s, c) => s + c.total_fatalities, 0);
  const totalInjuries = filtered.reduce((s, c) => s + c.total_injuries, 0);

  // State-level aggregation for chart
  const stateAgg = Object.values(
    filtered.reduce((acc: Record<string, { state: string; accidents: number; fatalities: number }>, c) => {
      if (!acc[c.state]) acc[c.state] = { state: c.state, accidents: 0, fatalities: 0 };
      acc[c.state].accidents += c.total_accidents;
      acc[c.state].fatalities += c.total_fatalities;
      return acc;
    }, {})
  ).sort((a, b) => b.accidents - a.accidents).slice(0, 10);

  // Top causes aggregation
  const causeCount: Record<string, number> = {};
  filtered.forEach(c => {
    (c.top_causes || []).forEach((cause: string) => {
      causeCount[cause] = (causeCount[cause] || 0) + 1;
    });
  });
  const topCauses = Object.entries(causeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">City-wise Accident Data</h1>
          <p className="text-muted-foreground mt-1">
            {cities.length} cities across India • Source: MoRTH / NCRB
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchAllCityData}
            disabled={fetching}
            variant="default"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            {fetching ? fetchProgress || 'Fetching...' : 'Fetch All City Data'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Cities Covered</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold text-foreground">{totalAccidents.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Accidents</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 text-center">
            <Skull className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-foreground">{totalFatalities.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Fatalities</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{totalInjuries.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Injuries</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Top 10 States by Accidents</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stateAgg}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="state" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="accidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fatalities" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Top Causes of Accidents</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={topCauses} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name?.substring(0, 12)}>
                    {topCauses.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search city or state..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accidents">Most Accidents</SelectItem>
                <SelectItem value="fatalities">Most Fatalities</SelectItem>
                <SelectItem value="rate">Highest Rate (per Lakh)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* City Detail Modal */}
      {selectedCity && (
        <Card className="border-2 border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl text-foreground">{selectedCity.city_name}, {selectedCity.state}</CardTitle>
              <p className="text-sm text-muted-foreground">Population: {selectedCity.population?.toLocaleString()} • Source: {selectedCity.source}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCity(null)}>✕</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-accent">
                <p className="text-2xl font-bold text-foreground">{selectedCity.total_accidents.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Accidents</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{selectedCity.total_fatalities.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Fatalities</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent">
                <p className="text-2xl font-bold text-foreground">{selectedCity.total_injuries.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Injuries</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Monthly Trend */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-foreground">Monthly Trend</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={selectedCity.monthly_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Line type="monotone" dataKey="accidents" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top Causes */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-foreground">Top Causes</h4>
                <div className="space-y-2">
                  {(selectedCity.top_causes || []).map((cause: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-sm text-foreground">{cause}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* City Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No city data yet</h3>
            <p className="text-muted-foreground mb-4">Click "Fetch All City Data" to scrape data for 100+ Indian cities from government sources.</p>
            <Button onClick={fetchAllCityData} disabled={fetching}>
              <RefreshCw className="w-4 h-4 mr-2" /> Fetch Data Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(city => (
            <Card
              key={city.id}
              className="stat-card cursor-pointer hover:border-primary/50 transition-all"
              onClick={() => setSelectedCity(city)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{city.city_name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {city.state}
                    </p>
                  </div>
                  <Badge
                    variant={city.accidents_per_lakh > 20 ? 'destructive' : city.accidents_per_lakh > 12 ? 'default' : 'secondary'}
                  >
                    {city.accidents_per_lakh}/lakh
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-warning">{city.total_accidents.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Accidents</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">{city.total_fatalities.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Fatalities</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">{city.total_injuries.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Injuries</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {(city.top_causes || []).slice(0, 2).map((cause: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {cause}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

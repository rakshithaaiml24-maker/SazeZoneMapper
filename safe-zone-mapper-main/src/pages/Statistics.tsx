import { useEffect, useState, useMemo } from 'react';
import { fetchAllAccidents } from '@/lib/fetchAllRows';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Calendar, Clock, MapPin, Car, Cloud, AlertTriangle, Users, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Accident {
  id: string; date: string; time: string | null; severity: string; vehicle_type: string;
  weather: string | null; cause: string | null; num_casualties: number | null;
  num_vehicles: number | null; location_name: string | null; latitude: number; longitude: number;
}

const COLORS = ['hsl(20, 90%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(142, 70%, 40%)', 'hsl(0, 84%, 60%)', 'hsl(200, 80%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(160, 60%, 45%)', 'hsl(340, 70%, 50%)'];

export default function Statistics() {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [cityStats, setCityStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      fetchAllAccidents('*'),
      supabase.from('city_accident_stats').select('*').order('total_accidents', { ascending: false }),
    ]).then(([accData, cityRes]) => {
      setAccidents(accData ?? []);
      setCityStats(cityRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const years = useMemo(() => [...new Set(accidents.map(a => a.date.slice(0, 4)))].sort(), [accidents]);
  const filtered = useMemo(() => yearFilter === 'all' ? accidents : accidents.filter(a => a.date.startsWith(yearFilter)), [accidents, yearFilter]);

  // Stats
  const totalCasualties = filtered.reduce((s, a) => s + (a.num_casualties || 0), 0);
  const fatalCount = filtered.filter(a => a.severity === 'fatal').length;
  const avgCasualties = filtered.length > 0 ? (totalCasualties / filtered.length).toFixed(2) : '0';

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach(a => {
      const month = a.date.slice(0, 7);
      if (!map[month]) map[month] = { fatal: 0, severe: 0, moderate: 0, minor: 0 };
      map[month][a.severity] = (map[month][a.severity] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      ...data, total: Object.values(data).reduce((s, v) => s + v, 0)
    }));
  }, [filtered]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    filtered.forEach(a => { if (a.time) { const h = parseInt(a.time.slice(0, 2)); if (!isNaN(h)) hours[h]++; } });
    return hours.map((count, h) => ({ hour: `${h.toString().padStart(2, '0')}:00`, count, label: h < 6 ? 'Night' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening' }));
  }, [filtered]);

  // Day of week
  const dayOfWeek = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = Array(7).fill(0);
    filtered.forEach(a => { counts[new Date(a.date).getDay()]++; });
    return days.map((d, i) => ({ day: d.slice(0, 3), count: counts[i] }));
  }, [filtered]);

  // Vehicle type
  const vehicleData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => { map[a.vehicle_type] = (map[a.vehicle_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Weather
  const weatherData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => { if (a.weather) map[a.weather] = (map[a.weather] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Cause
  const causeData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => { if (a.cause) map[a.cause] = (map[a.cause] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Top locations
  const topLocations = useMemo(() => {
    const map: Record<string, { count: number; fatal: number; casualties: number }> = {};
    filtered.forEach(a => {
      const loc = a.location_name || 'Unknown';
      if (!map[loc]) map[loc] = { count: 0, fatal: 0, casualties: 0 };
      map[loc].count++;
      if (a.severity === 'fatal') map[loc].fatal++;
      map[loc].casualties += a.num_casualties || 0;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [filtered]);

  // Severity by vehicle
  const sevByVehicle = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach(a => {
      if (!map[a.vehicle_type]) map[a.vehicle_type] = { minor: 0, moderate: 0, severe: 0, fatal: 0 };
      map[a.vehicle_type][a.severity] = (map[a.vehicle_type][a.severity] || 0) + 1;
    });
    return Object.entries(map).map(([vehicle, data]) => ({ vehicle, ...data })).sort((a, b) => ((b as any).fatal || 0) - ((a as any).fatal || 0)).slice(0, 8);
  }, [filtered]);

  // Casualties by cause
  const casualtiesByCause = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => { if (a.cause) map[a.cause] = (map[a.cause] || 0) + (a.num_casualties || 0); });
    return Object.entries(map).map(([name, casualties]) => ({ name, casualties })).sort((a, b) => b.casualties - a.casualties);
  }, [filtered]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Deep Statistics & Analytics</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} accidents analyzed</p>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Years</SelectItem>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Accidents', value: filtered.length, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Fatal Accidents', value: fatalCount, icon: Activity, color: 'severity-fatal' },
          { label: 'Total Casualties', value: totalCasualties, icon: Users, color: 'text-warning' },
          { label: 'Avg Casualties/Accident', value: avgCasualties, icon: TrendingUp, color: 'text-primary' },
          { label: 'Fatality Rate', value: `${filtered.length ? ((fatalCount / filtered.length) * 100).toFixed(1) : 0}%`, icon: Activity, color: 'text-destructive' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="stat-card text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend with severity breakdown */}
        <div className="stat-card lg:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Monthly Trend by Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="fatal" stackId="1" fill="hsl(0, 84%, 60%)" stroke="hsl(0, 84%, 60%)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="severe" stackId="1" fill="hsl(25, 95%, 53%)" stroke="hsl(25, 95%, 53%)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="moderate" stackId="1" fill="hsl(38, 92%, 50%)" stroke="hsl(38, 92%, 50%)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="minor" stackId="1" fill="hsl(142, 70%, 40%)" stroke="hsl(142, 70%, 40%)" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly distribution */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Hourly Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={2} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day of week */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Day of Week</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={dayOfWeek}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle type pie */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Vehicle Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={vehicleData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {vehicleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weather */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Cloud className="w-4 h-4 text-primary" /> Weather Conditions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={weatherData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {weatherData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Causes bar */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Accident Causes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={causeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Casualties by cause */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-destructive" /> Casualties by Cause</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={casualtiesByCause} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="casualties" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Severity by vehicle type */}
        <div className="stat-card lg:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-4">Severity Breakdown by Vehicle Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sevByVehicle}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="vehicle" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="minor" stackId="a" fill="hsl(142, 70%, 40%)" />
              <Bar dataKey="moderate" stackId="a" fill="hsl(38, 92%, 50%)" />
              <Bar dataKey="severe" stackId="a" fill="hsl(25, 95%, 53%)" />
              <Bar dataKey="fatal" stackId="a" fill="hsl(0, 84%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top dangerous locations */}
        <div className="stat-card lg:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-destructive" /> Top 15 Most Dangerous Locations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Location</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Accidents</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Fatal</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Casualties</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Danger Level</th>
              </tr></thead>
              <tbody>
                {topLocations.map((loc, i) => (
                  <tr key={loc.name} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 text-foreground font-medium">{loc.name}</td>
                    <td className="py-2 px-3 text-foreground">{loc.count}</td>
                    <td className="py-2 px-3 severity-fatal font-medium">{loc.fatal}</td>
                    <td className="py-2 px-3 text-foreground">{loc.casualties}</td>
                    <td className="py-2 px-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden w-24">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.min(100, (loc.count / (topLocations[0]?.count || 1)) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* City-Level Government Data Analytics */}
        {cityStats.length > 0 && (
          <>
            <div className="stat-card lg:col-span-2">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> City-Level Analytics — MoRTH/NCRB Data ({cityStats.length} cities)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="font-display text-lg font-bold text-foreground">{cityStats.length}</p>
                  <p className="text-xs text-muted-foreground">Cities Covered</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="font-display text-lg font-bold text-foreground">{cityStats.reduce((s: number, c: any) => s + (c.total_accidents || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">City Accidents</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="font-display text-lg font-bold text-destructive">{cityStats.reduce((s: number, c: any) => s + (c.total_fatalities || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">City Fatalities</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="font-display text-lg font-bold text-foreground">{cityStats.reduce((s: number, c: any) => s + (c.total_injuries || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">City Injuries</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="font-display text-lg font-bold text-primary">{(cityStats.reduce((s: number, c: any) => s + (c.population || 0), 0) / 100000).toFixed(0)}L</p>
                  <p className="text-xs text-muted-foreground">Population</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cityStats.slice(0, 20)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="city_name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="total_accidents" name="Accidents" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="total_fatalities" name="Fatalities" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="stat-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Accidents Per Lakh Population</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[...cityStats].sort((a, b) => (b.accidents_per_lakh || 0) - (a.accidents_per_lakh || 0)).slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="city_name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="accidents_per_lakh" name="Per Lakh" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="stat-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Fatalities Per Lakh Population</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[...cityStats].sort((a, b) => (b.fatalities_per_lakh || 0) - (a.fatalities_per_lakh || 0)).slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="city_name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="fatalities_per_lakh" name="Per Lakh" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

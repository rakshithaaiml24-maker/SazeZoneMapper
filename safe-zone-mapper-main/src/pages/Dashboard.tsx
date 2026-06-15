import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllAccidents } from '@/lib/fetchAllRows';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, MapPin, Users, ArrowUpRight, ArrowDownRight, Brain, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface Accident {
  id: string;
  date: string;
  severity: string;
  vehicle_type: string;
  weather: string | null;
  cause: string | null;
  num_casualties: number | null;
  location_name: string | null;
}

const SEVERITY_COLORS = ['hsl(142, 70%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(25, 95%, 53%)', 'hsl(0, 84%, 60%)'];
const SEVERITY_LABELS = ['minor', 'moderate', 'severe', 'fatal'];

export default function Dashboard() {
  const [allAccidents, setAllAccidents] = useState<Accident[]>([]);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [accData, zoneRes] = await Promise.all([
      fetchAllAccidents('*'),
      supabase.from('risk_zones').select('*').gte('risk_score', 70),
    ]);
    setAllAccidents(accData ?? []);
    setHighRiskCount(zoneRes.data?.length ?? 0);
    setLoading(false);
  }

  // Filtered accidents
  const accidents = useMemo(() => {
    return allAccidents.filter((a) => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterDateFrom && a.date < filterDateFrom) return false;
      if (filterDateTo && a.date > filterDateTo) return false;
      if (filterLocation && !(a.location_name?.toLowerCase() || '').includes(filterLocation.toLowerCase())) return false;
      return true;
    });
  }, [allAccidents, filterSeverity, filterDateFrom, filterDateTo, filterLocation]);

  // Stats
  const severityMap: Record<string, number> = { minor: 1, moderate: 2, severe: 3, fatal: 4 };
  const avgSeverity = accidents.length > 0
    ? accidents.reduce((sum, a) => sum + (severityMap[a.severity] || 1), 0) / accidents.length
    : 0;
  const totalCasualties = accidents.reduce((sum, a) => sum + (a.num_casualties || 0), 0);

  // Chart data
  const severityData = SEVERITY_LABELS.map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: accidents.filter((a) => a.severity === s).length,
  }));

  const vehicleData = Object.entries(
    accidents.reduce<Record<string, number>>((acc, a) => {
      acc[a.vehicle_type] = (acc[a.vehicle_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  const monthlyData = Object.entries(
    accidents.reduce<Record<string, number>>((acc, a) => {
      const month = a.date.slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, count]) => ({
    month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
    count,
  }));

  const causeData = Object.entries(
    accidents.reduce<Record<string, number>>((acc, a) => {
      if (a.cause) acc[a.cause] = (acc[a.cause] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  const statCards = [
    { label: 'Total Accidents', value: accidents.length, icon: AlertTriangle, trend: `${accidents.length} records`, up: true, color: 'text-destructive' },
    { label: 'High-Risk Zones', value: highRiskCount, icon: MapPin, trend: `${highRiskCount} zones`, up: highRiskCount > 0, color: 'text-warning' },
    { label: 'Avg Severity', value: avgSeverity.toFixed(1), icon: TrendingUp, trend: avgSeverity > 2.5 ? 'High' : 'Moderate', up: avgSeverity > 2.5, color: 'text-primary' },
    { label: 'Total Casualties', value: totalCasualties, icon: Users, trend: `${totalCasualties} people`, up: false, color: 'text-success' },
  ];

  async function runMLAnalysis() {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-risk-scores');
      if (error) throw error;
      toast.success(data.message || 'ML analysis complete');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  function clearFilters() {
    setFilterSeverity('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterLocation('');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const isFiltered = filterSeverity !== 'all' || filterDateFrom || filterDateTo || filterLocation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Traffic accident analysis — India
            {isFiltered && <span className="text-primary ml-2">({accidents.length}/{allAccidents.length} filtered)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button onClick={runMLAnalysis} disabled={analyzing} size="sm">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            {analyzing ? 'Analyzing...' : 'Run ML Analysis'}
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="stat-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {SEVERITY_LABELS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input placeholder="Search location..." value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              Clear filters
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className={`flex items-center gap-1 text-xs font-medium ${card.up ? 'text-destructive' : 'text-success'}`}>
                {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {card.trend}
              </span>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Monthly Accident Trend</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-16">No data yet. Add accident records to see trends.</p>
          )}
        </div>

        {/* Severity distribution */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Severity Distribution</h3>
          {accidents.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {severityData.map((_, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-16">No data available.</p>
          )}
        </div>

        {/* Vehicle types */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">By Vehicle Type</h3>
          {vehicleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vehicleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-16">No data available.</p>
          )}
        </div>

        {/* Top causes */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Top Accident Causes</h3>
          {causeData.length > 0 ? (
            <div className="space-y-3">
              {causeData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">{c.name}</span>
                      <span className="text-sm text-muted-foreground">{c.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(c.count / (causeData[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-16">No data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

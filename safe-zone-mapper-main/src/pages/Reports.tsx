import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllAccidents } from '@/lib/fetchAllRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Download, FileText, Table2, Filter, Search, ChevronLeft, ChevronRight,
  Clock, MapPin, Car, Cloud, AlertTriangle, Users, TrendingUp, BarChart3, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'hsl(142, 70%, 40%)',
  moderate: 'hsl(38, 92%, 50%)',
  severe: 'hsl(25, 95%, 53%)',
  fatal: 'hsl(0, 84%, 60%)',
};

const SEVERITY_OPTIONS = ['all', 'minor', 'moderate', 'severe', 'fatal'];
const VEHICLE_OPTIONS = ['all', 'Car', 'Motorcycle', 'Two Wheeler', 'Auto Rickshaw', 'Bus', 'Truck', 'Bicycle', 'Pedestrian'];
const WEATHER_OPTIONS = ['all', 'Clear', 'Rain', 'Fog', 'Wind'];
const CAUSE_OPTIONS = ['all', 'Speeding', 'Drunk Driving', 'Distracted Driving', 'Red Light Violation', 'Wrong Way', 'Poor Road Condition', 'Mechanical Failure'];

const PAGE_SIZE = 25;

interface Accident {
  id: string;
  date: string;
  time: string | null;
  severity: string;
  vehicle_type: string;
  weather: string | null;
  cause: string | null;
  num_casualties: number | null;
  num_vehicles: number | null;
  location_name: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  reported_by: string | null;
  created_at: string;
}

export default function Reports() {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [riskZones, setRiskZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterWeather, setFilterWeather] = useState('all');
  const [filterCause, setFilterCause] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'severity' | 'num_casualties'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [cityStats, setCityStats] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAllAccidents('*'),
      supabase.from('risk_zones').select('*').order('risk_score', { ascending: false }),
      supabase.from('city_accident_stats').select('*').order('total_accidents', { ascending: false }),
    ]).then(([accData, zoneRes, cityRes]) => {
      setAccidents(accData ?? []);
      setRiskZones(zoneRes.data ?? []);
      setCityStats(cityRes.data ?? []);
      setLoading(false);
    });
  }, []);

  // Filtered + sorted data
  const filtered = useMemo(() => {
    const severityOrder: Record<string, number> = { minor: 1, moderate: 2, severe: 3, fatal: 4 };
    let data = accidents.filter((a) => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterVehicle !== 'all' && a.vehicle_type !== filterVehicle) return false;
      if (filterWeather !== 'all' && a.weather !== filterWeather) return false;
      if (filterCause !== 'all' && a.cause !== filterCause) return false;
      if (filterDateFrom && a.date < filterDateFrom) return false;
      if (filterDateTo && a.date > filterDateTo) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (a.location_name?.toLowerCase() || '').includes(q) ||
          (a.cause?.toLowerCase() || '').includes(q) ||
          (a.description?.toLowerCase() || '').includes(q) ||
          a.vehicle_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
    data.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'severity') cmp = (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
      else cmp = (a.num_casualties || 0) - (b.num_casualties || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return data;
  }, [accidents, filterSeverity, filterVehicle, filterWeather, filterCause, filterDateFrom, filterDateTo, searchQuery, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [filterSeverity, filterVehicle, filterWeather, filterCause, filterDateFrom, filterDateTo, searchQuery]);

  // Analytics
  const severityCounts = useMemo(() => {
    const c: Record<string, number> = { minor: 0, moderate: 0, severe: 0, fatal: 0 };
    filtered.forEach((a) => { if (a.severity in c) c[a.severity]++; });
    return c;
  }, [filtered]);

  const totalCasualties = useMemo(() => filtered.reduce((s, a) => s + (a.num_casualties || 0), 0), [filtered]);
  const totalVehicles = useMemo(() => filtered.reduce((s, a) => s + (a.num_vehicles || 1), 0), [filtered]);

  const vehicleBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((a) => { m[a.vehicle_type] = (m[a.vehicle_type] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const causeBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((a) => { if (a.cause) m[a.cause] = (m[a.cause] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const weatherBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((a) => { if (a.weather) m[a.weather] = (m[a.weather] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((a) => { const mo = a.date.slice(0, 7); m[mo] = (m[mo] || 0) + 1; });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-24).map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      count,
    }));
  }, [filtered]);

  const hourlyDistribution = useMemo(() => {
    const hrs = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, count: 0 }));
    filtered.forEach((a) => {
      if (a.time) {
        const h = parseInt(a.time.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) hrs[h].count++;
      }
    });
    return hrs;
  }, [filtered]);

  const topLocations = useMemo(() => {
    const m: Record<string, { count: number; casualties: number }> = {};
    filtered.forEach((a) => {
      const loc = a.location_name || 'Unknown';
      if (!m[loc]) m[loc] = { count: 0, casualties: 0 };
      m[loc].count++;
      m[loc].casualties += a.num_casualties || 0;
    });
    return Object.entries(m).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  const radarData = useMemo(() => {
    return causeBreakdown.slice(0, 7).map((c) => ({
      cause: c.name,
      count: c.value,
      fullMark: Math.max(...causeBreakdown.map((x) => x.value), 1),
    }));
  }, [causeBreakdown]);

  function clearFilters() {
    setFilterSeverity('all');
    setFilterVehicle('all');
    setFilterWeather('all');
    setFilterCause('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  }

  const isFiltered = filterSeverity !== 'all' || filterVehicle !== 'all' || filterWeather !== 'all' || filterCause !== 'all' || filterDateFrom || filterDateTo || searchQuery;

  function exportCSV() {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Date', 'Time', 'Location', 'Latitude', 'Longitude', 'Vehicle Type', 'Severity', 'Weather', 'Cause', 'Casualties', 'Vehicles', 'Description'];
    const rows = filtered.map((a) => [
      a.date, a.time || '', a.location_name || '', a.latitude, a.longitude,
      a.vehicle_type, a.severity, a.weather || '', a.cause || '',
      a.num_casualties ?? 0, a.num_vehicles ?? 1, a.description || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `accident-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records as CSV`);
  }

  async function exportPDF() {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Traffic Accident Report — India', 14, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Records: ${filtered.length} | Casualties: ${totalCasualties} | Fatal: ${severityCounts.fatal}`, 14, 36);
    if (isFiltered) doc.text('* Filters applied — showing filtered data only', 14, 42);

    const tableData = filtered.slice(0, 100).map((a) => [
      a.date, a.time || '—', a.location_name || `${a.latitude.toFixed(3)},${a.longitude.toFixed(3)}`,
      a.vehicle_type, a.severity, a.weather || '—', a.cause || '—', String(a.num_casualties ?? 0),
    ]);

    (doc as any).autoTable({
      startY: isFiltered ? 48 : 42,
      head: [['Date', 'Time', 'Location', 'Vehicle', 'Severity', 'Weather', 'Cause', 'Casualties']],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`accident-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exported');
  }

  function severityBadge(sev: string) {
    const colors: Record<string, string> = {
      minor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      severe: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      fatal: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return <Badge variant="outline" className={`capitalize text-xs ${colors[sev] || ''}`}>{sev}</Badge>;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 70%, 40%)', 'hsl(280, 65%, 55%)', 'hsl(200, 80%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(160, 60%, 45%)'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length.toLocaleString()} accident records
            {isFiltered && <span className="text-primary ml-1">({accidents.length.toLocaleString()} total, filtered)</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />Filters
            {isFiltered && <span className="ml-1 w-2 h-2 rounded-full bg-primary inline-block" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Table2 className="w-4 h-4 mr-2" />CSV
          </Button>
          <Button size="sm" onClick={exportPDF}>
            <FileText className="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="stat-card overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by location, cause, description, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s === 'all' ? 'All Severities' : s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vehicle</Label>
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v === 'all' ? 'All Vehicles' : v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Weather</Label>
                <Select value={filterWeather} onValueChange={setFilterWeather}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEATHER_OPTIONS.map((w) => <SelectItem key={w} value={w}>{w === 'all' ? 'All Weather' : w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cause</Label>
                <Select value={filterCause} onValueChange={setFilterCause}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAUSE_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? 'All Causes' : c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Clear all
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Accidents', value: filtered.length.toLocaleString(), icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Total Casualties', value: totalCasualties.toLocaleString(), icon: Users, color: 'text-warning' },
          { label: 'Fatal', value: severityCounts.fatal, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Severe', value: severityCounts.severe, icon: TrendingUp, color: 'severity-severe' },
          { label: 'Vehicles Involved', value: totalVehicles.toLocaleString(), icon: Car, color: 'text-primary' },
          { label: 'High-Risk Zones', value: riskZones.filter((z) => z.risk_score >= 70).length, icon: MapPin, color: 'text-warning' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="stat-card text-center">
            <card.icon className={`w-4 h-4 mx-auto mb-1 ${card.color}`} />
            <p className="font-display text-xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Severity breakdown bar */}
      <div className="stat-card">
        <h3 className="font-display font-semibold text-foreground mb-3">Severity Breakdown</h3>
        <div className="flex h-4 rounded-full overflow-hidden bg-muted/50 mb-3">
          {Object.entries(severityCounts).map(([key, count]) => {
            const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0;
            return pct > 0 ? (
              <div key={key} style={{ width: `${pct}%`, backgroundColor: SEVERITY_COLORS[key] }} className="transition-all" title={`${key}: ${count} (${pct.toFixed(1)}%)`} />
            ) : null;
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(severityCounts).map(([key, count]) => (
            <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[key] }} />
              <div>
                <span className="text-sm font-bold text-foreground">{count}</span>
                <span className="text-xs text-muted-foreground ml-1 capitalize">{key}</span>
                <span className="text-xs text-muted-foreground ml-1">({filtered.length > 0 ? ((count / filtered.length) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Monthly Trend</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-12">No data</p>}
        </div>

        {/* Hourly distribution */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <Clock className="w-4 h-4 inline mr-2" />Hourly Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle type pie */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <Car className="w-4 h-4 inline mr-2" />By Vehicle Type
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {vehicleBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cause radar */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <AlertTriangle className="w-4 h-4 inline mr-2" />Accident Causes
          </h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="cause" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.25)" strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-12">No data</p>}
        </div>

        {/* Weather breakdown */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <Cloud className="w-4 h-4 inline mr-2" />Weather Conditions
          </h3>
          <div className="space-y-3">
            {weatherBreakdown.map((w, i) => (
              <div key={w.name} className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{w.name}</span>
                    <span className="text-sm text-muted-foreground">{w.value} ({filtered.length > 0 ? ((w.value / filtered.length) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(w.value / (weatherBreakdown[0]?.value || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top locations */}
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <MapPin className="w-4 h-4 inline mr-2" />Top 10 Accident Locations
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {topLocations.map((loc, i) => (
              <div key={loc.name} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-foreground font-medium">{loc.name}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{loc.count} accidents</span>
                  <span className="text-destructive">{loc.casualties} casualties</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed accident table */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-display font-semibold text-foreground">
            <BarChart3 className="w-4 h-4 inline mr-2" />Accident Records
          </h3>
          <div className="flex gap-2 items-center text-xs text-muted-foreground">
            <span>Sort:</span>
            <Select value={sortField} onValueChange={(v) => setSortField(v as any)}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="severity">Severity</SelectItem>
                <SelectItem value="num_casualties">Casualties</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}>
              {sortDir === 'desc' ? '↓' : '↑'}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Date</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Time</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Location</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Vehicle</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Severity</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Weather</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Cause</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">Casualties</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">Vehicles</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedAccident(a)}>
                  <td className="py-2 px-2 text-foreground text-xs">{a.date}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs">{a.time || '—'}</td>
                  <td className="py-2 px-2 text-foreground text-xs max-w-[180px] truncate">{a.location_name || `${a.latitude.toFixed(3)},${a.longitude.toFixed(3)}`}</td>
                  <td className="py-2 px-2 text-foreground text-xs">{a.vehicle_type}</td>
                  <td className="py-2 px-2">{severityBadge(a.severity)}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs">{a.weather || '—'}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs">{a.cause || '—'}</td>
                  <td className="py-2 px-2 text-right text-foreground text-xs font-medium">{a.num_casualties ?? 0}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground text-xs">{a.num_vehicles ?? 1}</td>
                  <td className="py-2 px-2"><Eye className="w-3 h-3 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} · {filtered.length} records
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* City-Level Analytics from Government/MoRTH Data */}
      {cityStats.length > 0 && (
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <TrendingUp className="w-4 h-4 inline mr-2" />City-Level Analytics — MoRTH Data ({cityStats.length} cities)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="font-display text-lg font-bold text-foreground">{cityStats.reduce((s, c) => s + (c.total_accidents || 0), 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total City Accidents</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="font-display text-lg font-bold text-destructive">{cityStats.reduce((s, c) => s + (c.total_fatalities || 0), 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Fatalities</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="font-display text-lg font-bold text-foreground">{cityStats.reduce((s, c) => s + (c.total_injuries || 0), 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Injuries</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="font-display text-lg font-bold text-primary">{(cityStats.reduce((s, c) => s + (c.population || 0), 0) / 100000).toFixed(0)} L</p>
              <p className="text-xs text-muted-foreground">Total Population Covered</p>
            </div>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">City</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">State</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs">Accidents</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs">Fatalities</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs">Per Lakh</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs">Fat/Lakh</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Danger</th>
                </tr>
              </thead>
              <tbody>
                {cityStats.slice(0, 50).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 text-foreground font-medium text-xs">{c.city_name}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{c.state}</td>
                    <td className="py-2 px-3 text-right text-foreground text-xs">{c.total_accidents?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-destructive text-xs font-medium">{c.total_fatalities?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-foreground text-xs">{c.accidents_per_lakh?.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right text-foreground text-xs">{c.fatalities_per_lakh?.toFixed(1)}</td>
                    <td className="py-2 px-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden w-16">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.min(100, ((c.accidents_per_lakh || 0) / (cityStats[0]?.accidents_per_lakh || 1)) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Zones table */}
      {riskZones.length > 0 && (
        <div className="stat-card">
          <h3 className="font-display font-semibold text-foreground mb-4">
            <MapPin className="w-4 h-4 inline mr-2" />Risk Zones ({riskZones.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Zone</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Risk Score</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Accidents</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Avg Severity</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {riskZones.map((z) => (
                  <tr key={z.id} className="border-b border-border/30">
                    <td className="py-2 px-3 text-foreground">{z.zone_name || 'Unnamed'}</td>
                    <td className="py-2 px-3">
                      <span className={`font-bold ${z.risk_score >= 80 ? 'text-destructive' : z.risk_score >= 50 ? 'severity-moderate' : 'text-success'}`}>
                        {z.risk_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-foreground">{z.accident_count}</td>
                    <td className="py-2 px-3 text-muted-foreground">{z.avg_severity?.toFixed(2) || '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{z.latitude.toFixed(4)}, {z.longitude.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accident detail dialog */}
      <Dialog open={!!selectedAccident} onOpenChange={() => setSelectedAccident(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Accident Details</DialogTitle>
          </DialogHeader>
          {selectedAccident && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {severityBadge(selectedAccident.severity)}
                <span className="text-sm text-muted-foreground">{selectedAccident.date} at {selectedAccident.time || 'Unknown time'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-foreground font-medium">{selectedAccident.location_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Coordinates</p>
                  <p className="text-foreground">{selectedAccident.latitude.toFixed(4)}, {selectedAccident.longitude.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle Type</p>
                  <p className="text-foreground">{selectedAccident.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weather</p>
                  <p className="text-foreground">{selectedAccident.weather || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cause</p>
                  <p className="text-foreground">{selectedAccident.cause || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Casualties</p>
                  <p className="text-foreground font-bold">{selectedAccident.num_casualties ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicles Involved</p>
                  <p className="text-foreground">{selectedAccident.num_vehicles ?? 1}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported</p>
                  <p className="text-foreground text-xs">{new Date(selectedAccident.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedAccident.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">{selectedAccident.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

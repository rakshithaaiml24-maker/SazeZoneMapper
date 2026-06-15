import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllAccidents } from '@/lib/fetchAllRows';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Eye, MapPin, Clock, Cloud, Car, Users, ChevronLeft, ChevronRight, AlertTriangle, X, ExternalLink, RefreshCw, Wifi } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AccidentRow {
  id: string;
  date: string;
  time: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  vehicle_type: string;
  severity: string;
  weather: string | null;
  cause: string | null;
  num_vehicles: number | null;
  num_casualties: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_LABELS = ['minor', 'moderate', 'severe', 'fatal'];
const PER_PAGE = 25;

export default function AccidentRecords() {
  const [accidents, setAccidents] = useState<AccidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<AccidentRow | null>(null);
  const [page, setPage] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterWeather, setFilterWeather] = useState('all');
  const [filterCause, setFilterCause] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'severity' | 'num_casualties'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    const data = await fetchAllAccidents('*');
    setAccidents(data ?? []);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Realtime subscription — auto-refresh on any change
    const channel = supabase
      .channel('accidents-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'accidents' }, (payload) => {
        setAccidents(prev => [payload.new as AccidentRow, ...prev]);
        setLastUpdate(new Date());
        toast.info('New accident record added', { description: (payload.new as any).location_name || 'Unknown location' });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'accidents' }, (payload) => {
        setAccidents(prev => prev.map(a => a.id === (payload.new as any).id ? payload.new as AccidentRow : a));
        setLastUpdate(new Date());
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'accidents' }, (payload) => {
        setAccidents(prev => prev.filter(a => a.id !== (payload.old as any).id));
        setLastUpdate(new Date());
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // Unique values for filter dropdowns
  const vehicleTypes = useMemo(() => [...new Set(accidents.map(a => a.vehicle_type))].sort(), [accidents]);
  const weatherTypes = useMemo(() => [...new Set(accidents.map(a => a.weather).filter(Boolean))].sort() as string[], [accidents]);
  const causeTypes = useMemo(() => [...new Set(accidents.map(a => a.cause).filter(Boolean))].sort() as string[], [accidents]);

  const filtered = useMemo(() => {
    const sevOrder: Record<string, number> = { minor: 1, moderate: 2, severe: 3, fatal: 4 };
    let result = accidents.filter((a) => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterVehicle !== 'all' && a.vehicle_type !== filterVehicle) return false;
      if (filterWeather !== 'all' && a.weather !== filterWeather) return false;
      if (filterCause !== 'all' && a.cause !== filterCause) return false;
      if (filterDateFrom && a.date < filterDateFrom) return false;
      if (filterDateTo && a.date > filterDateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (a.location_name?.toLowerCase() || '').includes(q) ||
          a.vehicle_type.toLowerCase().includes(q) ||
          (a.cause?.toLowerCase() || '').includes(q) ||
          (a.description?.toLowerCase() || '').includes(q);
      }
      return true;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'severity') cmp = (sevOrder[a.severity] || 0) - (sevOrder[b.severity] || 0);
      else if (sortField === 'num_casualties') cmp = (a.num_casualties || 0) - (b.num_casualties || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [accidents, filterSeverity, filterVehicle, filterWeather, filterCause, filterDateFrom, filterDateTo, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [filterSeverity, filterVehicle, filterWeather, filterCause, filterDateFrom, filterDateTo, search, sortField, sortDir]);

  const isFiltered = filterSeverity !== 'all' || filterVehicle !== 'all' || filterWeather !== 'all' || filterCause !== 'all' || filterDateFrom || filterDateTo || search;

  const sevBadge = (s: string) => {
    const m: Record<string, string> = {
      minor: 'bg-severity-minor/15 severity-minor',
      moderate: 'bg-severity-moderate/15 severity-moderate',
      severe: 'bg-severity-severe/15 severity-severe',
      fatal: 'bg-severity-fatal/15 severity-fatal',
    };
    return m[s] || '';
  };

  function clearFilters() {
    setFilterSeverity('all'); setFilterVehicle('all'); setFilterWeather('all');
    setFilterCause('all'); setFilterDateFrom(''); setFilterDateTo(''); setSearch('');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Accident Records</h1>
          <p className="text-muted-foreground mt-1">
            {accidents.length} total records
            {isFiltered && <span className="text-primary ml-2">({filtered.length} filtered)</span>}
            <span className="inline-flex items-center gap-1 ml-3">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              <span className={`text-xs ${isLive ? 'text-success' : 'text-muted-foreground'}`}>{isLive ? 'Live' : 'Connecting...'}</span>
            </span>
            {lastUpdate && <span className="text-xs text-muted-foreground ml-2">Updated {lastUpdate.toLocaleTimeString('en-IN')}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadData(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters {isFiltered && <Badge variant="secondary" className="ml-1 text-xs">{filtered.length}</Badge>}
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SEVERITY_LABELS.map(s => {
          const count = accidents.filter(a => a.severity === s).length;
          return (
            <div key={s} className="stat-card text-center cursor-pointer hover:ring-2 ring-primary/30 transition-all" onClick={() => { setFilterSeverity(s); setShowFilters(true); }}>
              <p className={`font-display text-2xl font-bold ${s === 'minor' ? 'severity-minor' : s === 'moderate' ? 'severity-moderate' : s === 'severe' ? 'severity-severe' : 'severity-fatal'}`}>{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{s}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="stat-card">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div><Label className="text-xs">Search</Label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Location, cause, vehicle..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
                <div><Label className="text-xs">Severity</Label><Select value={filterSeverity} onValueChange={setFilterSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{SEVERITY_LABELS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Vehicle</Label><Select value={filterVehicle} onValueChange={setFilterVehicle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{vehicleTypes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Weather</Label><Select value={filterWeather} onValueChange={setFilterWeather}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{weatherTypes.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Cause</Label><Select value={filterCause} onValueChange={setFilterCause}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{causeTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">From</Label><Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} /></div>
                <div><Label className="text-xs">To</Label><Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} /></div>
                <div><Label className="text-xs">Sort</Label>
                  <div className="flex gap-1">
                    <Select value={sortField} onValueChange={v => setSortField(v as any)}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date">Date</SelectItem><SelectItem value="severity">Severity</SelectItem><SelectItem value="num_casualties">Casualties</SelectItem></SelectContent></Select>
                    <Button variant="outline" size="icon" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="shrink-0">{sortDir === 'desc' ? '↓' : '↑'}</Button>
                  </div>
                </div>
              </div>
              {isFiltered && <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={clearFilters}><X className="w-3 h-3 mr-1" /> Clear all filters</Button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Time</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Location</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Vehicle</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Severity</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Casualties</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Weather</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Cause</th>
              <th className="text-right py-3 px-3 text-muted-foreground font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((a) => (
              <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedAccident(a)}>
                <td className="py-3 px-3 text-foreground">{new Date(a.date).toLocaleDateString('en-IN')}</td>
                <td className="py-3 px-3 text-muted-foreground">{a.time ? a.time.slice(0,5) : '—'}</td>
                <td className="py-3 px-3 text-foreground max-w-[200px] truncate">{a.location_name || `${a.latitude.toFixed(3)}, ${a.longitude.toFixed(3)}`}</td>
                <td className="py-3 px-3 text-foreground">{a.vehicle_type}</td>
                <td className="py-3 px-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${sevBadge(a.severity)}`}>{a.severity}</span></td>
                <td className="py-3 px-3 text-foreground font-medium">{a.num_casualties ?? 0}</td>
                <td className="py-3 px-3 text-muted-foreground">{a.weather || '—'}</td>
                <td className="py-3 px-3 text-muted-foreground">{a.cause || '—'}</td>
                <td className="py-3 px-3 text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAccident(a); }}><Eye className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · Showing {(page-1)*PER_PAGE + 1}-{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)}>{p}</Button>;
            })}
            {totalPages > 5 && page < totalPages - 2 && <span className="px-2 text-muted-foreground">...</span>}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedAccident} onOpenChange={() => setSelectedAccident(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedAccident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  Accident Detail
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ml-2 ${sevBadge(selectedAccident.severity)}`}>{selectedAccident.severity}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Location header */}
                <div className="stat-card">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedAccident.location_name || 'Unknown Location'}</h3>
                      <p className="text-sm text-muted-foreground">Lat: {selectedAccident.latitude.toFixed(6)}, Lng: {selectedAccident.longitude.toFixed(6)}</p>
                      <a href={`https://maps.google.com/?q=${selectedAccident.latitude},${selectedAccident.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> View on Google Maps
                      </a>
                    </div>
                  </div>
                </div>

                {/* Grid info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="stat-card">
                    <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Date & Time</span></div>
                    <p className="font-medium text-foreground">{new Date(selectedAccident.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm text-muted-foreground">{selectedAccident.time ? `Time: ${selectedAccident.time}` : 'Time not recorded'}</p>
                  </div>
                  <div className="stat-card">
                    <div className="flex items-center gap-2 mb-1"><Car className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Vehicle Type</span></div>
                    <p className="font-medium text-foreground">{selectedAccident.vehicle_type}</p>
                    <p className="text-sm text-muted-foreground">{selectedAccident.num_vehicles || 1} vehicle(s) involved</p>
                  </div>
                  <div className="stat-card">
                    <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Casualties</span></div>
                    <p className="font-medium text-foreground text-lg">{selectedAccident.num_casualties ?? 0}</p>
                    <p className="text-sm text-muted-foreground">people affected</p>
                  </div>
                  <div className="stat-card">
                    <div className="flex items-center gap-2 mb-1"><Cloud className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Weather</span></div>
                    <p className="font-medium text-foreground">{selectedAccident.weather || 'Not recorded'}</p>
                  </div>
                </div>

                {/* Cause */}
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Accident Cause</p>
                  <p className="font-medium text-foreground">{selectedAccident.cause || 'Not specified'}</p>
                </div>

                {/* Description */}
                {selectedAccident.description && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Description / Notes</p>
                    <p className="text-foreground text-sm leading-relaxed">{selectedAccident.description}</p>
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                  <span>Record ID: {selectedAccident.id.slice(0, 8)}...</span>
                  <span>Added: {new Date(selectedAccident.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

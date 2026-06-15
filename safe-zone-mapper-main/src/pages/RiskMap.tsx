import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllAccidents } from '@/lib/fetchAllRows';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { motion } from 'framer-motion';
import { RefreshCw, Filter, Layers, BarChart3, MapPin, AlertTriangle, Clock, Car, Search, X, Database, Globe, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatePresence } from 'framer-motion';
import AISafetyPanel from '@/components/AISafetyPanel';

interface Accident {
  id: string;
  latitude: number;
  longitude: number;
  severity: string;
  date: string;
  time: string | null;
  location_name: string | null;
  vehicle_type: string;
  cause: string | null;
  weather: string | null;
  num_casualties: number | null;
  num_vehicles: number | null;
  description: string | null;
}

interface RiskZone {
  id: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  risk_score: number;
  zone_name: string | null;
  accident_count: number;
  avg_severity: number | null;
  factors: {
    model?: string;
    top_cause?: string;
    top_weather?: string;
    fatal_count?: number;
    severe_count?: number;
    total_casualties?: number;
    feature_scores?: Record<string, number>;
  } | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  minor: '#22c55e',
  moderate: '#eab308',
  severe: '#f97316',
  fatal: '#ef4444',
};

const SEVERITY_OPTIONS = ['all', 'minor', 'moderate', 'severe', 'fatal'];

export default function RiskMap() {
  const [allAccidents, setAllAccidents] = useState<Accident[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [liveMode, setLiveMode] = useState<'live' | 'fallback'>('live');
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');

  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterWeather, setFilterWeather] = useState('all');
  const [filterCause, setFilterCause] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Derive dynamic filter options from data
  const cityOptions = useMemo(() => {
    const cities = [...new Set(allAccidents.map(a => a.location_name).filter(Boolean))].sort() as string[];
    return ['all', ...cities];
  }, [allAccidents]);

  const stateOptions = useMemo(() => {
    const states = new Set<string>();
    allAccidents.forEach(a => {
      const loc = a.location_name || '';
      // Extract state from "City, State" format or use as-is for state-only entries
      const parts = loc.split(', ');
      if (parts.length > 1) states.add(parts[parts.length - 1]);
      else states.add(loc);
    });
    return ['all', ...[...states].sort()];
  }, [allAccidents]);

  const vehicleOptions = useMemo(() => {
    const vehicles = [...new Set(allAccidents.map(a => a.vehicle_type))].sort();
    return ['all', ...vehicles];
  }, [allAccidents]);

  const weatherOptions = useMemo(() => {
    const weathers = [...new Set(allAccidents.map(a => a.weather).filter(Boolean))].sort() as string[];
    return ['all', ...weathers];
  }, [allAccidents]);

  const causeOptions = useMemo(() => {
    const causes = [...new Set(allAccidents.map(a => a.cause).filter(Boolean))].sort() as string[];
    return ['all', ...causes];
  }, [allAccidents]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const accidentLayerRef = useRef<L.LayerGroup | null>(null);
  const riskLayerRef = useRef<L.LayerGroup | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [accData, zoneRes] = await Promise.all([
      fetchAllAccidents('*'),
      supabase.from('risk_zones').select('*').order('risk_score', { ascending: false }),
    ]);
    setAllAccidents(accData ?? []);
    setRiskZones((zoneRes.data ?? []) as RiskZone[]);
    if (!silent) setLoading(false);
  };

  const filtered = useMemo(() => {
    return allAccidents.filter((a) => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterVehicle !== 'all' && a.vehicle_type !== filterVehicle) return false;
      if (filterWeather !== 'all' && a.weather !== filterWeather) return false;
      if (filterCause !== 'all' && a.cause !== filterCause) return false;
      if (filterCity !== 'all' && a.location_name !== filterCity) return false;
      if (filterState !== 'all') {
        const loc = a.location_name || '';
        const parts = loc.split(', ');
        const state = parts.length > 1 ? parts[parts.length - 1] : loc;
        if (state !== filterState) return false;
      }
      if (filterDateFrom && a.date < filterDateFrom) return false;
      if (filterDateTo && a.date > filterDateTo) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (a.location_name?.toLowerCase() || '').includes(q)
          || (a.cause?.toLowerCase() || '').includes(q)
          || a.vehicle_type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allAccidents, filterSeverity, filterVehicle, filterWeather, filterCause, filterCity, filterState, filterDateFrom, filterDateTo, searchQuery]);

  // Auto-zoom when a city is selected
  useEffect(() => {
    if (!mapRef.current || filterCity === 'all') return;
    const cityAccidents = filtered.filter(a => a.location_name === filterCity);
    if (cityAccidents.length === 0) return;
    const bounds = L.latLngBounds(cityAccidents.map(a => [a.latitude, a.longitude] as [number, number]));
    mapRef.current.flyToBounds(bounds.pad(0.3), { maxZoom: 13, duration: 1.2 });
  }, [filterCity, filtered]);

  // City report when a city is selected
  const cityReport = useMemo(() => {
    if (filterCity === 'all') return null;
    const cityData = filtered;
    if (cityData.length === 0) return null;

    const sev: Record<string, number> = { minor: 0, moderate: 0, severe: 0, fatal: 0 };
    let totalCasualties = 0;
    const causes: Record<string, number> = {};
    const vehicles: Record<string, number> = {};
    const weathers: Record<string, number> = {};
    const hourly = Array(24).fill(0);
    const monthly: Record<string, number> = {};

    cityData.forEach(a => {
      if (a.severity in sev) sev[a.severity]++;
      totalCasualties += a.num_casualties || 0;
      if (a.cause) causes[a.cause] = (causes[a.cause] || 0) + 1;
      vehicles[a.vehicle_type] = (vehicles[a.vehicle_type] || 0) + 1;
      if (a.weather) weathers[a.weather] = (weathers[a.weather] || 0) + 1;
      if (a.time) {
        const h = parseInt(a.time.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) hourly[h]++;
      }
      const month = a.date?.slice(0, 7);
      if (month) monthly[month] = (monthly[month] || 0) + 1;
    });

    const topCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topVehicles = Object.entries(vehicles).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topWeather = Object.entries(weathers).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const peakHour = hourly.indexOf(Math.max(...hourly));

    return { total: cityData.length, sev, totalCasualties, topCauses, topVehicles, topWeather, peakHour, hourly };
  }, [filterCity, filtered]);

  const stats = useMemo(() => {
    const sev: Record<string, number> = { minor: 0, moderate: 0, severe: 0, fatal: 0 };
    let casualties = 0;
    const vehicles: Record<string, number> = {};
    const hourly = Array(24).fill(0);

    filtered.forEach((a) => {
      if (a.severity in sev) sev[a.severity]++;
      casualties += a.num_casualties || 0;
      vehicles[a.vehicle_type] = (vehicles[a.vehicle_type] || 0) + 1;
      if (a.time) {
        const h = parseInt(a.time.split(':')[0], 10);
        if (!Number.isNaN(h) && h >= 0 && h < 24) hourly[h]++;
      }
    });

    const topVehicle = Object.entries(vehicles).sort((a, b) => b[1] - a[1])[0];
    const peakHour = hourly.indexOf(Math.max(...hourly));

    return { sev, casualties, topVehicle, peakHour };
  }, [filtered]);

  const isFiltered = filterSeverity !== 'all' || filterVehicle !== 'all' || filterWeather !== 'all' || filterCause !== 'all' || filterCity !== 'all' || filterState !== 'all' || filterDateFrom || filterDateTo || searchQuery;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5, 78.9],
      zoom: 5,
      zoomControl: true,
    });

    const tile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tile;
    mapRef.current = map;
    accidentLayerRef.current = L.layerGroup().addTo(map);
    riskLayerRef.current = L.layerGroup().addTo(map);

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Switch tile layer when mapStyle changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);
    const url = mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const attr = mapStyle === 'satellite'
      ? '&copy; Esri &copy; Maxar'
      : '&copy; OSM &copy; CARTO';
    const tile = L.tileLayer(url, { attribution: attr, maxZoom: 19 }).addTo(mapRef.current);
    tileLayerRef.current = tile;
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 50);
    return () => clearTimeout(timer);
  }, [loading, showFilters, showStats]);

  // Dynamic data: realtime + polling fallback
  useEffect(() => {
    let active = true;
    let pollMs = 12000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedulePoll = () => {
      if (!active) return;
      timeoutId = setTimeout(async () => {
        if (!active) return;
        setLiveMode('fallback');
        await fetchData(true);
        pollMs = Math.min(Math.round(pollMs * 1.2), 30000);
        schedulePoll();
      }, pollMs);
    };

    const resetPoll = () => {
      pollMs = 12000;
      if (timeoutId) clearTimeout(timeoutId);
      schedulePoll();
    };

    const channel = supabase
      .channel('risk-map-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accidents' }, async () => {
        setLiveMode('live');
        await fetchData(true);
        resetPoll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_zones' }, async () => {
        setLiveMode('live');
        await fetchData(true);
        resetPoll();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setLiveMode('live');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setLiveMode('fallback');
        }
      });

    schedulePoll();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || loading) return;
    const map = mapRef.current;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    accidentLayerRef.current?.clearLayers();
    riskLayerRef.current?.clearLayers();

    if (showZones) {
      for (const z of riskZones) {
        const color = z.risk_score >= 80 ? '#ef4444' : z.risk_score >= 60 ? '#f97316' : z.risk_score >= 40 ? '#eab308' : '#22c55e';
        const factors = z.factors || {};

        L.circle([z.latitude, z.longitude], {
          radius: z.radius_km * 1000,
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '5,5',
        })
          .bindPopup(`
            <div style="font-family:'Space Grotesk',sans-serif;padding:4px 2px;min-width:240px">
              <div style="font-size:15px;font-weight:700;margin-bottom:8px;color:${color};border-bottom:2px solid ${color};padding-bottom:6px">${z.zone_name || 'Risk Zone'}</div>
              <table style="width:100%;font-size:12px;line-height:1.8;border-collapse:collapse">
                <tr><td style="opacity:0.5;padding-right:12px">Risk Score</td><td style="font-weight:700;font-size:16px;color:${color}">${z.risk_score.toFixed(1)}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Accidents</td><td style="font-weight:600">${z.accident_count}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Casualties</td><td style="font-weight:600">${factors.total_casualties ?? 0}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Top Cause</td><td style="font-weight:600">${factors.top_cause || '—'}</td></tr>
              </table>
              <div style="font-size:10px;opacity:0.4;margin-top:6px;text-align:right">${factors.model || 'Random Forest'}</div>
            </div>
          `)
          .on('click', () => setSelectedZone(z))
          .addTo(riskLayerRef.current!);

        L.marker([z.latitude, z.longitude], {
          icon: L.divIcon({
            className: 'risk-label',
            html: `<div style="background:${color};color:white;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px">${z.risk_score.toFixed(0)}</div>`,
            iconSize: [40, 20],
            iconAnchor: [20, 10],
          }),
        }).addTo(riskLayerRef.current!);
      }
    }

    if (showHeat && filtered.length > 0) {
      const points = filtered.map((a) => {
        const intensity = a.severity === 'fatal' ? 1 : a.severity === 'severe' ? 0.75 : a.severity === 'moderate' ? 0.5 : 0.25;
        return [a.latitude, a.longitude, intensity] as [number, number, number];
      });

      const heat = (L as any).heatLayer(points, {
        radius: 20,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.15: '#22c55e', 0.35: '#eab308', 0.55: '#f97316', 0.75: '#ef4444', 1: '#991b1b' },
      });

      heat.addTo(map);
      heatLayerRef.current = heat;
    }

    if (showMarkers) {
      for (const a of filtered) {
        const color = SEVERITY_COLOR[a.severity] || '#888';

        L.circleMarker([a.latitude, a.longitude], {
          radius: a.severity === 'fatal' ? 8 : a.severity === 'severe' ? 6 : 4,
          color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 1,
        })
          .bindPopup(`
            <div style="font-family:'Space Grotesk',sans-serif;padding:4px 2px;min-width:250px">
              <div style="font-size:15px;font-weight:700;margin-bottom:8px;border-bottom:2px solid ${color};padding-bottom:6px">${a.location_name || 'Unknown Location'}</div>
              <table style="width:100%;font-size:12px;line-height:1.8;border-collapse:collapse">
                <tr><td style="opacity:0.5;padding-right:12px">Date</td><td style="font-weight:500">${a.date} ${a.time || ''}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Severity</td><td><span style="background:${color};color:#fff;padding:1px 8px;border-radius:4px;font-weight:700;font-size:11px;text-transform:uppercase">${a.severity}</span></td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Vehicle</td><td style="font-weight:500">${a.vehicle_type}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Cause</td><td style="font-weight:500">${a.cause || '—'}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Weather</td><td style="font-weight:500">${a.weather || '—'}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Casualties</td><td style="font-weight:700;color:#ef4444">${a.num_casualties ?? 0}</td></tr>
                <tr><td style="opacity:0.5;padding-right:12px">Vehicles</td><td style="font-weight:500">${a.num_vehicles ?? 1}</td></tr>
              </table>
              ${a.description ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.1);font-size:11px;opacity:0.65;font-style:italic">${a.description}</div>` : ''}
            </div>
          `)
          .addTo(accidentLayerRef.current!);
      }
    }

    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((a) => [a.latitude, a.longitude] as [number, number]));
      map.fitBounds(bounds.pad(0.1), { maxZoom: 12 });
    }
  }, [filtered, riskZones, showHeat, showMarkers, showZones, loading]);

  function clearFilters() {
    setFilterSeverity('all');
    setFilterVehicle('all');
    setFilterWeather('all');
    setFilterCause('all');
    setFilterCity('all');
    setFilterState('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  }

  function flyToZone(z: RiskZone) {
    mapRef.current?.flyTo([z.latitude, z.longitude], 13, { duration: 1.5 });
    setSelectedZone(z);
  }

  async function generatePanIndiaData() {
    setGenerating(true);
    let batchStart = 0;
    const batchSize = 15;
    try {
      while (true) {
        toast.info(`Generating data for cities ${batchStart + 1}...`);
        const { data, error } = await supabase.functions.invoke('generate-city-accidents', {
          body: { batch_start: batchStart, batch_size: batchSize },
        });
        if (error) { toast.error(error.message); break; }
        toast.success(`Added ${data.inserted} records for ${data.cities_processed?.length} cities`);
        if (data.next_batch === null) { toast.success('All cities done!'); break; }
        batchStart = data.next_batch;
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e: any) { toast.error(e.message); }
    setGenerating(false);
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Risk Map</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length.toLocaleString()} accidents mapped
            {isFiltered && <span className="text-primary ml-1">(filtered)</span>}
            <span className="ml-2 text-xs text-muted-foreground">
              • {liveMode === 'live' ? 'Live updates' : 'Polling fallback'}
            </span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={showAI ? 'default' : 'outline'} size="sm" onClick={() => setShowAI(v => !v)}>
            <Sparkles className="w-4 h-4 mr-1" />AI Intelligence
          </Button>
          <Button variant="default" size="sm" onClick={generatePanIndiaData} disabled={generating}>
            <Database className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate All-India Data'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4 mr-1" />Filters
            {isFiltered && <span className="ml-1 w-2 h-2 rounded-full bg-primary inline-block" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowStats((v) => !v)}>
            <BarChart3 className="w-4 h-4 mr-1" />{showStats ? 'Hide' : 'Show'} Stats
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search locations, causes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">{stateOptions.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All States' : s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">{cityOptions.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? 'All Cities' : c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITY_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s === 'all' ? 'All' : s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vehicle</Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">{vehicleOptions.map((v) => <SelectItem key={v} value={v}>{v === 'all' ? 'All' : v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Weather</Label>
              <Select value={filterWeather} onValueChange={setFilterWeather}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{weatherOptions.map((w) => <SelectItem key={w} value={w}>{w === 'all' ? 'All' : w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cause</Label>
              <Select value={filterCause} onValueChange={setFilterCause}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">{causeOptions.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? 'All' : c}</SelectItem>)}</SelectContent>
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
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>
          </div>
        </motion.div>
      )}

      <div className="stat-card flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Layers:</span>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showHeat} onChange={() => setShowHeat(!showHeat)} className="accent-primary" /> Heatmap
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showMarkers} onChange={() => setShowMarkers(!showMarkers)} className="accent-primary" /> Markers
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showZones} onChange={() => setShowZones(!showZones)} className="accent-primary" /> Risk Zones
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <Button
            variant={mapStyle === 'satellite' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : 'dark')}
          >
            {mapStyle === 'satellite' ? 'Satellite' : 'Dark'}
          </Button>
        </div>
      </div>

      {showStats && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="stat-card text-center">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <p className="font-display text-lg font-bold text-foreground">{filtered.length.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total on Map</p>
          </div>
          <div className="stat-card text-center">
            <span className="text-lg font-bold text-destructive">{stats.sev.fatal}</span>
            <p className="text-xs text-muted-foreground">Fatal</p>
          </div>
          <div className="stat-card text-center">
            <span className="text-lg font-bold severity-severe">{stats.sev.severe}</span>
            <p className="text-xs text-muted-foreground">Severe</p>
          </div>
          <div className="stat-card text-center">
            <span className="text-lg font-bold text-foreground">{stats.casualties.toLocaleString()}</span>
            <p className="text-xs text-muted-foreground">Casualties</p>
          </div>
          <div className="stat-card text-center">
            <Car className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-sm font-bold text-foreground">{stats.topVehicle?.[0] || '—'}</p>
            <p className="text-xs text-muted-foreground">Top Vehicle</p>
          </div>
          <div className="stat-card text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 severity-moderate" />
            <p className="text-sm font-bold text-foreground">{stats.peakHour}:00</p>
            <p className="text-xs text-muted-foreground">Peak Hour</p>
          </div>
        </motion.div>
      )}

      <div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card p-0 overflow-hidden relative" style={{ height: '65vh' }}>
          <div ref={mapContainerRef} className="h-full w-full" aria-label="Risk map" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </motion.div>
      </div>

      {selectedZone && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              {selectedZone.zone_name || 'Risk Zone'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedZone(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className={`text-2xl font-bold ${selectedZone.risk_score >= 80 ? 'text-destructive' : selectedZone.risk_score >= 60 ? 'severity-severe' : 'severity-moderate'}`}>{selectedZone.risk_score.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accidents</p>
              <p className="text-2xl font-bold text-foreground">{selectedZone.accident_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Casualties</p>
              <p className="text-2xl font-bold text-foreground">{selectedZone.factors?.total_casualties ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Cause</p>
              <p className="text-sm font-bold text-foreground">{selectedZone.factors?.top_cause || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fatal</p>
              <p className="text-2xl font-bold text-destructive">{selectedZone.factors?.fatal_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Model</p>
              <p className="text-xs font-medium text-muted-foreground">{selectedZone.factors?.model || 'Random Forest'}</p>
            </div>
          </div>
        </motion.div>
      )}

      {cityReport && filterCity !== 'all' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              City Report: {filterCity}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setFilterCity('all')}><X className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Accidents</p>
              <p className="text-2xl font-bold text-foreground">{cityReport.total}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Casualties</p>
              <p className="text-2xl font-bold text-destructive">{cityReport.totalCasualties}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Fatal</p>
              <p className="text-2xl font-bold text-destructive">{cityReport.sev.fatal}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Severe</p>
              <p className="text-2xl font-bold severity-severe">{cityReport.sev.severe}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Moderate</p>
              <p className="text-2xl font-bold severity-moderate">{cityReport.sev.moderate}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Peak Hour</p>
              <p className="text-2xl font-bold text-foreground">{cityReport.peakHour}:00</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-primary" /> Top Causes
              </h4>
              <div className="space-y-1.5">
                {cityReport.topCauses.map(([cause, count]) => (
                  <div key={cause} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{cause}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-primary/20 w-16 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(count / cityReport.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-primary" /> Top Vehicles
              </h4>
              <div className="space-y-1.5">
                {cityReport.topVehicles.map(([vehicle, count]) => (
                  <div key={vehicle} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{vehicle}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-accent/40 w-16 overflow-hidden">
                        <div className="h-full rounded-full bg-accent-foreground" style={{ width: `${(count / cityReport.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Weather Impact
              </h4>
              <div className="space-y-1.5">
                {cityReport.topWeather.map(([weather, count]) => (
                  <div key={weather} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{weather}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-muted/30 w-16 overflow-hidden">
                        <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${(count / cityReport.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showAI && <AISafetyPanel onClose={() => setShowAI(false)} />}
      </AnimatePresence>
    </div>
  );
}

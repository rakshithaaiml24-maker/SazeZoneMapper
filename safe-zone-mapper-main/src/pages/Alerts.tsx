import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, RefreshCw, Filter, Loader2, Satellite, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
  risk_zone_id: string | null;
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchAlerts().then((count) => {
      if (count === 0) fetchGovtAlerts();
    });

    // Auto-fetch every 30 minutes
    const interval = setInterval(() => { fetchGovtAlerts(); }, 30 * 60 * 1000);

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const newAlert = payload.new as Alert;
        setAlerts((prev) => [newAlert, ...prev]);
        toast.info(newAlert.title, { description: newAlert.message.slice(0, 100) });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, (payload) => {
        const updated = payload.new as Alert;
        setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  async function fetchAlerts(): Promise<number> {
    setLoading(true);
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
    setAlerts(data ?? []);
    setLoading(false);
    return data?.length ?? 0;
  }

  async function fetchGovtAlerts() {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-govt-alerts');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');
      toast.success(data.message || `Fetched ${data.count} alerts from govt data`);
      await fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch govt alerts');
    } finally {
      setFetching(false);
    }
  }

  async function markRead(id: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  }

  async function markAllRead() {
    const unread = alerts.filter((a) => !a.is_read);
    if (unread.length === 0) return;
    for (const a of unread) {
      await supabase.from('alerts').update({ is_read: true }).eq('id', a.id);
    }
    setAlerts(alerts.map((a) => ({ ...a, is_read: true })));
    toast.success('All alerts marked as read');
  }

  // Extract category from message
  function getCategory(msg: string) {
    const match = msg.match(/Category:\s*(\w+)/i);
    return match ? match[1].toLowerCase() : 'general';
  }

  const categories = ['all', ...new Set(alerts.map(a => getCategory(a.message)))];

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterStatus === 'unread' && a.is_read) return false;
    if (filterStatus === 'read' && !a.is_read) return false;
    if (filterCategory !== 'all' && getCategory(a.message) !== filterCategory) return false;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const govtCount = alerts.filter((a) => a.message.includes('MoRTH') || a.message.includes('NCRB')).length;

  const iconMap: Record<string, typeof Info> = { info: Info, warning: AlertTriangle, critical: XCircle };
  const colorMap: Record<string, string> = {
    info: 'text-primary bg-primary/10',
    warning: 'text-warning bg-warning/10',
    critical: 'text-destructive bg-destructive/10',
  };
  const badgeMap: Record<string, string> = {
    info: 'bg-primary/20 text-primary border-primary/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Alerts & Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount} unread · {alerts.length} total
            <span className="inline-flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success">Live</span>
            </span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="default" size="sm" onClick={fetchGovtAlerts} disabled={fetching}>
            {fetching ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Satellite className="w-4 h-4 mr-1" />}
            {fetching ? 'Fetching...' : 'Fetch Govt Data'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="w-4 h-4 mr-1" />Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle className="w-4 h-4 mr-1" />Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="stat-card text-center">
          <Bell className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl font-bold text-foreground">{alerts.length}</p>
          <p className="text-xs text-muted-foreground">Total Alerts</p>
        </div>
        <div className="stat-card text-center">
          <p className="font-display text-2xl font-bold text-primary">{unreadCount}</p>
          <p className="text-xs text-muted-foreground">Unread</p>
        </div>
        <div className="stat-card text-center">
          <XCircle className="w-5 h-5 mx-auto mb-1 text-destructive" />
          <p className="font-display text-2xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
        <div className="stat-card text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 severity-moderate" />
          <p className="font-display text-2xl font-bold severity-moderate">{warningCount}</p>
          <p className="text-xs text-muted-foreground">Warnings</p>
        </div>
        <div className="stat-card text-center">
          <Database className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl font-bold text-primary">{govtCount}</p>
          <p className="text-xs text-muted-foreground">Govt Data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="stat-card flex flex-wrap items-center gap-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filteredAlerts.length} shown</span>
      </div>

      {/* Info banner */}
      <div className="stat-card border-l-4 border-l-primary flex items-start gap-3">
        <Satellite className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-foreground font-medium">Real Government Data Integration</p>
          <p className="text-xs text-muted-foreground">Click "Fetch Govt Data" to get the latest traffic safety alerts analyzed from MoRTH (Ministry of Road Transport & Highways) and NCRB data. Alerts are generated using AI analysis of official Indian road accident patterns, blackspot data, and seasonal trends.</p>
        </div>
      </div>

      {/* Alert list */}
      {filteredAlerts.length === 0 ? (
        <div className="stat-card text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No alerts match your filters.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Click "Fetch Govt Data" to generate alerts from government road safety data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAlerts.map((alert, i) => {
              const Icon = iconMap[alert.severity] || Info;
              const colors = colorMap[alert.severity] || colorMap.info;
              const category = getCategory(alert.message);
              const isGovt = alert.message.includes('MoRTH') || alert.message.includes('NCRB');

              // Parse message parts
              const mainMsg = alert.message.split(' | ')[0];
              const metaParts = alert.message.split(' | ').slice(1);

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className={`stat-card flex items-start gap-4 ${!alert.is_read ? 'border-l-4 border-l-primary' : 'opacity-60'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground text-sm">{alert.title}</h3>
                        <Badge variant="outline" className={`text-xs ${badgeMap[alert.severity] || ''}`}>{alert.severity}</Badge>
                        {isGovt && <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Govt Data</Badge>}
                        {category !== 'general' && <Badge variant="outline" className="text-xs capitalize">{category}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{mainMsg}</p>
                    {metaParts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {metaParts.map((part, j) => (
                          <span key={j} className="text-xs bg-muted/30 px-2 py-1 rounded text-muted-foreground">{part.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!alert.is_read && (
                    <button onClick={() => markRead(alert.id)} className="text-xs text-primary hover:underline shrink-0 mt-1">Mark read</button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

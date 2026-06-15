import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Send, MapPin, AlertTriangle, Phone, Mail, User, Loader2, CheckCircle2, Info } from 'lucide-react';

const VEHICLE_TYPES = ['Two Wheeler', 'Car', 'Auto Rickshaw', 'Bus', 'Truck', 'Bicycle', 'Pedestrian', 'Other'];
const SEVERITY = ['minor', 'moderate', 'severe', 'fatal'];
const WEATHER = ['Clear', 'Rain', 'Fog', 'Snow', 'Wind', 'Other'];
const CAUSES = ['Speeding', 'Drunk Driving', 'Distracted Driving', 'Red Light Violation', 'Wrong Way', 'Poor Road Condition', 'Mechanical Failure', 'Other'];
const URGENCY = ['normal', 'high', 'critical'];

export default function ReportAccident() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: user?.email || '',
    reporter_phone: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    latitude: '',
    longitude: '',
    location_name: '',
    vehicle_type: 'Car',
    severity: 'moderate',
    weather: 'Clear',
    cause: 'Speeding',
    num_vehicles: '1',
    num_casualties: '0',
    description: '',
    urgency: 'normal',
  });

  function useCurrentLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => toast.error('Could not get location')
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) { toast.error('Please provide valid coordinates'); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-report-email', { body: form });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to submit');
      setSubmitted(true);
      toast.success('Report submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="stat-card text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Report Submitted Successfully!</h2>
          <p className="text-muted-foreground mb-2">Your accident report has been recorded in the system and authorities have been notified.</p>
          <p className="text-sm text-muted-foreground mb-6">Report sent to: <span className="text-primary font-medium">Government Traffic Authority</span></p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setSubmitted(false); setForm(f => ({ ...f, description: '', location_name: '', latitude: '', longitude: '' })); }}>Submit Another Report</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Report an Accident</h1>
        <p className="text-muted-foreground mt-1">Submit a detailed report. This will be saved to our database and forwarded to the government traffic authority for action.</p>
      </div>

      {/* Info banner */}
      <div className="stat-card border-l-4 border-l-primary flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-foreground font-medium">Your report matters!</p>
          <p className="text-xs text-muted-foreground">Every report helps identify dangerous spots and saves lives. Reports are sent to the government traffic authority (dixit12sharma@gmail.com) and stored for analysis.</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reporter Info */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Reporter Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Your Name</Label><Input value={form.reporter_name} onChange={e => setForm({ ...form, reporter_name: e.target.value })} placeholder="Full name" /></div>
              <div><Label>Email</Label><Input type="email" value={form.reporter_email} onChange={e => setForm({ ...form, reporter_email: e.target.value })} placeholder="email@example.com" /></div>
              <div><Label>Phone</Label><Input value={form.reporter_phone} onChange={e => setForm({ ...form, reporter_phone: e.target.value })} placeholder="+91 XXXXX XXXXX" /></div>
            </div>
          </div>

          {/* Accident Details */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> Accident Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div><Label>Time</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
              <div>
                <Label>Urgency Level</Label>
                <Select value={form.urgency} onValueChange={v => setForm({ ...form, urgency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle Type *</Label><Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VEHICLE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Severity *</Label><Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITY.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Weather</Label><Select value={form.weather} onValueChange={v => setForm({ ...form, weather: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WEATHER.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Cause</Label><Select value={form.cause} onValueChange={v => setForm({ ...form, cause: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CAUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Vehicles Involved</Label><Input type="number" min="1" value={form.num_vehicles} onChange={e => setForm({ ...form, num_vehicles: e.target.value })} /></div>
              <div><Label>Casualties</Label><Input type="number" min="0" value={form.num_casualties} onChange={e => setForm({ ...form, num_casualties: e.target.value })} /></div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><Label>Location Name / Address</Label><Input value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. MG Road, Bangalore near Signal #4" /></div>
              <div><Label>Latitude *</Label><Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="12.9716" required /></div>
              <div><Label>Longitude *</Label><Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="77.5946" required /></div>
              <div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={useCurrentLocation}><MapPin className="w-4 h-4 mr-2" /> Use My Location</Button></div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Detailed Description / Witness Account</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what happened in detail — road conditions, visibility, number of people, injuries observed, police response, ambulance called, etc." rows={5} />
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {submitting ? 'Submitting Report...' : 'Submit Report to Authorities'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

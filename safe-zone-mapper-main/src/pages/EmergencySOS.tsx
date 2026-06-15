import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MapPin, AlertTriangle, Heart, Shield, Siren, Navigation, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const emergencyContacts = [
  { name: 'National Emergency Number', number: '112', desc: 'Works across India for all emergencies', icon: Siren, color: 'text-destructive bg-destructive/10' },
  { name: 'Police', number: '100', desc: 'For crime, accident, law & order', icon: Shield, color: 'text-primary bg-primary/10' },
  { name: 'Ambulance (EMRI)', number: '108', desc: 'Free emergency medical service', icon: Heart, color: 'text-success bg-success/10' },
  { name: 'Fire Service', number: '101', desc: 'Fire emergencies & rescue', icon: AlertTriangle, color: 'severity-fatal bg-severity-fatal/10' },
  { name: 'Highway Patrol', number: '1033', desc: 'National Highway accidents', icon: Navigation, color: 'text-warning bg-warning/10' },
  { name: 'Women Helpline', number: '1091', desc: 'Women in distress', icon: Phone, color: 'text-primary bg-primary/10' },
  { name: 'Child Helpline', number: '1098', desc: 'Children in need of care', icon: Phone, color: 'text-primary bg-primary/10' },
  { name: 'Road Accident Emergency', number: '1073', desc: 'MoRTH helpline for accidents', icon: Siren, color: 'text-destructive bg-destructive/10' },
];

const firstAidSteps = [
  { step: 1, title: 'Ensure Safety', desc: 'Check the scene is safe. Turn on hazard lights. Place warning triangles if available.' },
  { step: 2, title: 'Call 112 / 108', desc: 'Call emergency services immediately. Give exact location, number of injured, and nature of injuries.' },
  { step: 3, title: 'Don\'t Move the Injured', desc: 'Unless there is immediate danger (fire, sinking vehicle), do NOT move accident victims. Spinal injuries can worsen.' },
  { step: 4, title: 'Stop Bleeding', desc: 'Apply firm pressure with a clean cloth. Elevate the wounded limb if possible. Do not remove embedded objects.' },
  { step: 5, title: 'Keep Them Conscious', desc: 'Talk to the injured, keep them awake and calm. Cover them with a blanket to prevent shock.' },
  { step: 6, title: 'Legal Protection', desc: 'Good Samaritan Law (2016) protects bystanders who help accident victims from legal liability. You are protected by law.' },
];

export default function EmergencySOS() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  function getLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoadingLocation(false); toast.success('Location acquired'); },
      () => { setLoadingLocation(false); toast.error('Could not get location'); }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-destructive flex items-center gap-2">
          <Siren className="w-7 h-7" /> Emergency SOS
        </h1>
        <p className="text-muted-foreground mt-1">Quick access to emergency services, first aid guide, and your location sharing</p>
      </div>

      {/* SOS Location Share */}
      <div className="stat-card border-2 border-destructive/30">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-destructive" /> Share Your Location</h3>
        <p className="text-sm text-muted-foreground mb-3">Get your current GPS coordinates to share with emergency services or family.</p>
        <Button variant="destructive" onClick={getLocation} disabled={loadingLocation} className="mb-3">
          {loadingLocation ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
          {loadingLocation ? 'Getting Location...' : 'Get My Location'}
        </Button>
        {location && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-muted/20 rounded-lg p-4 space-y-2">
            <p className="text-sm text-foreground"><strong>Latitude:</strong> {location.lat.toFixed(6)}</p>
            <p className="text-sm text-foreground"><strong>Longitude:</strong> {location.lng.toFixed(6)}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')}>Open in Google Maps</Button>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${location.lat}, ${location.lng}`); toast.success('Coordinates copied!'); }}>Copy Coordinates</Button>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`I need help! My location: https://maps.google.com/?q=${location.lat},${location.lng}`); toast.success('SOS message copied! Share via WhatsApp/SMS'); }}>Copy SOS Message</Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Emergency Contacts */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-3">Emergency Contacts — India</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {emergencyContacts.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={c.number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="stat-card flex items-center gap-4 hover:ring-2 ring-primary/20 transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">{c.name}</h4>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <a href={`tel:${c.number}`} className="shrink-0">
                  <Button variant="outline" size="sm" className="font-mono text-lg font-bold">{c.number}</Button>
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* First Aid Guide */}
      <div className="stat-card">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-destructive" /> First Aid at Accident Scene</h3>
        <div className="space-y-4">
          {firstAidSteps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">{s.step}</div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{s.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Good Samaritan Law */}
      <div className="stat-card border-l-4 border-l-success">
        <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-success" /> Good Samaritan Law — India</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">Under the Motor Vehicles (Amendment) Act, 2019, any person who helps an accident victim in good faith is protected from civil or criminal liability. You cannot be questioned, detained, or harassed by police or hospital staff. <strong className="text-foreground">Your help can save lives — don't hesitate.</strong></p>
      </div>
    </div>
  );
}

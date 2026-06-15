import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  FileText,
  Bell,
  Menu,
  X,
  Shield,
  LogOut,
  Send,
  BarChart3,
  HeartPulse,
  Siren,
  Building2,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Risk Map', icon: Map },
  { href: '/accidents', label: 'Accident Records', icon: AlertTriangle },
  { href: '/report', label: 'Report Accident', icon: Send },
  { href: '/statistics', label: 'Deep Statistics', icon: BarChart3 },
  { href: '/city-data', label: 'City Data', icon: Building2 },
  { href: '/reports', label: 'Reports & Export', icon: FileText },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/safety', label: 'Safety Guide', icon: HeartPulse },
  { href: '/emergency', label: 'Emergency SOS', icon: Siren },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-foreground">TrafficGuard</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} className="text-foreground">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="bg-card border-b border-border p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </nav>
      )}
    </div>
  );
}

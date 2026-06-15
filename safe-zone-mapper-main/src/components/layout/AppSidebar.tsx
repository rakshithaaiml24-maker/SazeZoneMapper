import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  Map,
  FileText,
  AlertTriangle,
  Bell,
  LogOut,
  Activity,
  Shield,
  Send,
  BarChart3,
  HeartPulse,
  Siren,
  Building2 } from
'lucide-react';

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
{ href: '/emergency', label: 'Emergency SOS', icon: Siren }];


export default function AppSidebar() {
  const { pathname } = useLocation();
  const { signOut, user, role } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border/50 min-h-screen">
      <div className="p-6 border-b border-sidebar-border/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
           <h1 className="font-bold text-primary text-xl font-serif">TrafficGuard</h1>
            <p className="text-xs text-sidebar-foreground/60">India Road Safety</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active ?
              'bg-sidebar-accent text-sidebar-primary' :
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`
              }>
              
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>);

        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user?.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{role?.replace('_', ' ')}</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full">
          
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>);

}
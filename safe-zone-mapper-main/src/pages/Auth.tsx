import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Shield, AlertTriangle, MapPin, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Auth() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('Welcome back!');
      } else {
        await signUp(email, password, fullName);
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: AlertTriangle, title: 'Accident Tracking', desc: 'Record and analyze accident data' },
    { icon: MapPin, title: 'Risk Zone Mapping', desc: 'Interactive heatmaps of danger zones' },
    { icon: BarChart3, title: 'Predictive Analytics', desc: 'ML-powered risk scoring engine' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center flex-1 bg-sidebar p-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-sidebar-primary-foreground">TrafficGuard</h1>
              <p className="text-sm text-sidebar-foreground/60">Accident Analysis & Prediction</p>
            </div>
          </div>
          <h2 className="font-display text-4xl font-bold text-sidebar-primary-foreground mb-4 leading-tight">
            Predict. Prevent.<br />Protect Lives.
          </h2>
          <p className="text-sidebar-foreground/70 text-lg mb-10 max-w-md">
            Advanced traffic accident analysis with machine learning-powered risk zone prediction to make roads safer.
          </p>
          <div className="space-y-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-sidebar-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sidebar-primary-foreground">{f.title}</h3>
                  <p className="text-sm text-sidebar-foreground/60">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-display text-xl font-bold text-foreground">TrafficGuard</h1>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isLogin ? 'Sign in to your account' : 'Get started with TrafficGuard'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

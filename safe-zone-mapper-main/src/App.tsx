import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import RiskMap from "@/pages/RiskMap";
import AccidentRecords from "@/pages/AccidentForm";
import ReportAccident from "@/pages/ReportAccident";
import Reports from "@/pages/Reports";
import Alerts from "@/pages/Alerts";
import SafetyTips from "@/pages/SafetyTips";
import EmergencySOS from "@/pages/EmergencySOS";
import Statistics from "@/pages/Statistics";
import CityData from "@/pages/CityData";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/map" element={<RiskMap />} />
              <Route path="/accidents" element={<AccidentRecords />} />
              <Route path="/report" element={<ReportAccident />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/city-data" element={<CityData />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/safety" element={<SafetyTips />} />
              <Route path="/emergency" element={<EmergencySOS />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

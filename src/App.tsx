import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useAppRealtime } from "@/hooks/useAppRealtime";
import { UsersProvider } from "@/contexts/UsersContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { LeadsManagement } from "./pages/LeadsManagement";
import { PipelinePage } from "./pages/PipelineBoard";
import { DealDetailsPage } from "./pages/DealDetailsPage";
import UserManagementPage from "./pages/UserManagementPage";
import LeadDetailsPage from "./pages/LeadDetailsPage";
import ImportLeadsPage from "./pages/ImportLeadsPage";
import { AdminPanel } from "./pages/AdminPanel";
import { DashboardLayout } from "@/components/DashboardLayout";

const queryClient = new QueryClient();

// Component to enable realtime updates
const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppRealtime();
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UsersProvider>
          <RealtimeProvider>
            <BrowserRouter>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/leads" element={
                  <ProtectedRoute>
                    <LeadsManagement />
                  </ProtectedRoute>
                } />
                <Route path="/leads/import" element={
                  <ProtectedRoute>
                    <ImportLeadsPage />
                  </ProtectedRoute>
                } />
                <Route path="/leads/:id" element={
                  <ProtectedRoute>
                    <LeadDetailsPage />
                  </ProtectedRoute>
                } />
                <Route path="/pipeline" element={
                  <ProtectedRoute>
                    <PipelinePage />
                  </ProtectedRoute>
                } />
                <Route path="/deals/:id" element={
                  <ProtectedRoute>
                    <DealDetailsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="leads_manager">
                    <DashboardLayout>
                      <AdminPanel />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requiredRole="leads_manager">
                    <DashboardLayout>
                      <UserManagementPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </BrowserRouter>
        </RealtimeProvider>
        </UsersProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

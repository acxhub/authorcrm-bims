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
import { SalesBoard } from "./pages/SalesBoard";
import { SoldDashboard } from "./pages/SoldDashboard";
import { CommissionsPage } from "./pages/CommissionsPage";
import { RemindersPage } from "./pages/RemindersPage";
import { AdminArchive } from "./pages/AdminArchive";
import { LeadManager } from "./pages/LeadManager";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AttendanceReportPage } from "./pages/AttendanceReportPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

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
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager", "sales"]}>
                    <PipelinePage />
                  </ProtectedRoute>
                } />
                <Route path="/deals/:id" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager", "sales"]}>
                    <DealDetailsPage />
                  </ProtectedRoute>
                } />
                <Route path="/sales-board" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager", "sales"]}>
                    <SalesBoard />
                  </ProtectedRoute>
                } />
                <Route path="/sold-dashboard" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager", "sales"]}>
                    <SoldDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/commissions" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager", "sales"]}>
                    <CommissionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/reminders" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager", "sales"]}>
                    <RemindersPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager"]}>
                    <AdminPanel />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager"]}>
                    <UserManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/archive" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager"]}>
                    <AdminArchive />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />
                <Route path="/lead-manager" element={
                  <ProtectedRoute requiredRole="leads_manager">
                    <LeadManager />
                  </ProtectedRoute>
                } />
                <Route path="/admin/attendance" element={
                  <ProtectedRoute requiredRole={["leads_manager", "sales_manager"]}>
                    <AttendanceReportPage />
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

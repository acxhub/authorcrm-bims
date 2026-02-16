import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BarChart3 } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const PipelinePage: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 flex-shrink-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Sales Pipeline</h1>
                    <p className="text-sm text-gray-600">Track and manage your deals through the sales process</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Main Content - Full height container with overflow hidden */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <PipelineBoard />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}; 
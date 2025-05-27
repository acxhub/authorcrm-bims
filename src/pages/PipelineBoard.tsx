import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, Settings, Plus, TrendingUp, Users, Target, Clock } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { usePipelineMetrics } from '@/hooks/usePipelineMetrics';

export const PipelinePage: React.FC = () => {
  const { refetch, isLoading } = useLeads({}, 1, 1000);
  const { metrics, isLoading: metricsLoading } = usePipelineMetrics();

  const handleRefresh = () => {
    refetch();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Pipeline Board</h1>
                  <p className="text-sm text-gray-600">Drag and drop leads through your sales pipeline.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white/60 backdrop-blur-sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </div>
            </div>
          </header>

          <main className="p-6">
            <div className="space-y-6">
              {/* Pipeline Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Total Leads</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {metricsLoading ? '--' : metrics.totalLeads.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">All statuses</div>
                    </div>
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Active Leads</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {metricsLoading ? '--' : metrics.activeLeads.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">In progress</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Conversion Rate</div>
                      <div className="text-2xl font-bold text-green-600">
                        {metricsLoading ? '--' : `${metrics.conversionRate}%`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metricsLoading ? 'This month' : `${metrics.recentActivity.closedWonThisMonth} won this month`}
                      </div>
                    </div>
                    <Target className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Avg. Time</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {metricsLoading ? '--' : `${metrics.averageTimeToClose}`} days
                      </div>
                      <div className="text-xs text-gray-500">To close</div>
                    </div>
                    <Clock className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              {!metricsLoading && metrics.statusBreakdown.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/60">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Status Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {metrics.statusBreakdown.slice(0, 8).map((status) => (
                      <div key={status.statusId} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.statusColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {status.statusName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {status.count} ({status.percentage}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Summary */}
              {!metricsLoading && (
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/60">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {metrics.recentActivity.newLeadsThisWeek}
                      </div>
                      <div className="text-xs text-gray-500">New leads this week</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {metrics.recentActivity.closedWonThisMonth}
                      </div>
                      <div className="text-xs text-gray-500">Won this month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {metrics.recentActivity.closedLostThisMonth}
                      </div>
                      <div className="text-xs text-gray-500">Lost this month</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pipeline Board */}
              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-6 border border-gray-200/60">
                <PipelineBoard />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}; 
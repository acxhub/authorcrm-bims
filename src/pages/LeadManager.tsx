import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { LeadManagerStats } from '@/components/lead-manager/LeadManagerStats';
import { AgentWorkloadSection } from '@/components/lead-manager/AgentWorkloadSection';
import { StaleLeadsSection } from '@/components/lead-manager/StaleLeadsSection';
import { UnassignedLeadsSection } from '@/components/lead-manager/UnassignedLeadsSection';
import { TagDistributionSection } from '@/components/lead-manager/TagDistributionSection';
import { useLeadManagerMetrics } from '@/hooks/useLeadManagerMetrics';

export const LeadManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('workload');
  const [staleDays, setStaleDays] = useState(60);
  const queryClient = useQueryClient();
  const { data: metrics, isLoading, refetch } = useLeadManagerMetrics(staleDays);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lead-manager-metrics'] });
    refetch();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-white/80 backdrop-blur-md px-6">
          <div>
            <h1 className="text-xl font-semibold">Leads Cockpit</h1>
            <p className="text-sm text-muted-foreground">
              Manage lead distribution and agent workloads
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        <main className="flex-1 p-6 space-y-6">
          <LeadManagerStats 
            metrics={metrics} 
            isLoading={isLoading} 
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="workload">Agent Workload</TabsTrigger>
              <TabsTrigger value="stale">Stale Leads</TabsTrigger>
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="workload" className="mt-6">
              <AgentWorkloadSection 
                agentWorkloads={metrics?.agentWorkloads || []}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="stale" className="mt-6">
              <StaleLeadsSection
                staleDays={staleDays}
                onStaleDaysChange={setStaleDays}
                neverTouchedCount={metrics?.neverTouchedLeads || 0}
                wentColdCount={metrics?.wentColdLeads || 0}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="unassigned" className="mt-6">
              <UnassignedLeadsSection
                unassignedCount={metrics?.unassignedLeads || 0}
                agentWorkloads={metrics?.agentWorkloads || []}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="tags" className="mt-6">
              <TagDistributionSection
                tagDistribution={metrics?.tagDistribution || []}
                totalLeads={metrics?.totalActiveLeads || 0}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

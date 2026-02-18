import React, { useState } from 'react';
import { UserX, Wand2, Users, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { AgentWorkload } from '@/lib/api/leadManagerMetrics';
import { LeadsModal } from './LeadsModal';
import { useAutoAssignLeads, useUnassignedLeadsManager } from '@/hooks/useLeadManagerMetrics';
import { useToast } from '@/hooks/use-toast';

interface UnassignedLeadsSectionProps {
  unassignedCount: number;
  agentWorkloads: AgentWorkload[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const UnassignedLeadsSection: React.FC<UnassignedLeadsSectionProps> = ({
  unassignedCount,
  agentWorkloads,
  isLoading,
  onRefresh,
}) => {
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showAutoAssignPreview, setShowAutoAssignPreview] = useState(false);
  const [selectedLeadCount, setSelectedLeadCount] = useState(50);
  
  const { data: unassignedData } = useUnassignedLeadsManager(1, 100);
  const autoAssignMutation = useAutoAssignLeads();
  const { toast } = useToast();

  const activeAgents = agentWorkloads.filter(a => a.isActive);
  
  // Calculate distribution preview
  const calculateDistribution = (count: number) => {
    if (activeAgents.length === 0) return [];
    
    const sortedAgents = [...activeAgents].sort((a, b) => a.totalLeads - b.totalLeads);
    const distribution: { agent: AgentWorkload; newLeads: number; newTotal: number }[] = [];
    
    let remaining = count;
    let index = 0;
    
    while (remaining > 0) {
      const agent = sortedAgents[index % sortedAgents.length];
      const existing = distribution.find(d => d.agent.userId === agent.userId);
      
      if (existing) {
        existing.newLeads++;
        existing.newTotal++;
      } else {
        distribution.push({
          agent,
          newLeads: 1,
          newTotal: agent.totalLeads + 1,
        });
      }
      
      remaining--;
      index++;
    }
    
    return distribution.sort((a, b) => b.newLeads - a.newLeads);
  };

  const distributionPreview = calculateDistribution(selectedLeadCount);

  const handleAutoAssign = async () => {
    const leadIds = unassignedData?.data?.slice(0, selectedLeadCount).map((l: any) => l.id) || [];
    
    if (leadIds.length === 0) {
      toast({
        title: 'No Leads to Assign',
        description: 'There are no unassigned leads available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await autoAssignMutation.mutateAsync(leadIds);
      setShowAutoAssignPreview(false);
      onRefresh();
    } catch (error) {
      console.error('Auto-assign failed:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate max leads for even distribution
  const maxLeadsPerAgent = activeAgents.length > 0 
    ? Math.max(...activeAgents.map(a => a.totalLeads))
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Unassigned Leads Queue
              </CardTitle>
              <CardDescription>
                {unassignedCount.toLocaleString()} leads waiting for assignment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowLeadsModal(true)}
                disabled={unassignedCount === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
              <Button 
                onClick={() => setShowAutoAssignPreview(true)}
                disabled={unassignedCount === 0 || activeAgents.length === 0}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Assign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unassignedCount === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-lg">No Unassigned Leads</h3>
              <p className="text-muted-foreground">All leads have been assigned to agents.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {unassignedCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-700">Unassigned Leads</div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {activeAgents.length}
                  </div>
                  <div className="text-sm text-blue-700">Active Agents</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {activeAgents.length > 0 
                      ? Math.ceil(unassignedCount / activeAgents.length)
                      : 0}
                  </div>
                  <div className="text-sm text-green-700">Per Agent (avg)</div>
                </div>
              </div>

              {/* Agent Workload Preview */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Agent Workloads
                </h4>
                <div className="space-y-2">
                  {activeAgents.slice(0, 5).map((agent) => (
                    <div key={agent.userId} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={agent.avatarUrl || ''} />
                        <AvatarFallback className="text-xs">
                          {getInitials(agent.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{agent.fullName}</span>
                          <span className="text-sm text-muted-foreground">
                            {agent.totalLeads} leads
                          </span>
                        </div>
                        <Progress 
                          value={maxLeadsPerAgent > 0 ? (agent.totalLeads / maxLeadsPerAgent) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                  {activeAgents.length > 5 && (
                    <div className="text-sm text-muted-foreground text-center">
                      +{activeAgents.length - 5} more agents
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Quick Auto-Assign</h4>
                  <p className="text-sm text-muted-foreground">
                    Distribute leads evenly based on current workload
                  </p>
                </div>
                <Button 
                  onClick={() => setShowAutoAssignPreview(true)}
                  disabled={unassignedCount === 0 || activeAgents.length === 0}
                >
                  Configure
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Modal */}
      <LeadsModal
        open={showLeadsModal}
        onClose={() => setShowLeadsModal(false)}
        title="Unassigned Leads"
        description={`${unassignedCount} leads waiting for assignment`}
        filterType="unassigned"
      />

      {/* Auto-Assign Preview Dialog */}
      <Dialog open={showAutoAssignPreview} onOpenChange={setShowAutoAssignPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Auto-Assign Leads
            </DialogTitle>
            <DialogDescription>
              Distribute unassigned leads based on current workload (agents with fewer leads get more)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Number of leads to assign:</label>
              <div className="flex gap-2 mt-2">
                {[25, 50, 100, unassignedCount].map((count) => (
                  <Button
                    key={count}
                    variant={selectedLeadCount === count ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedLeadCount(Math.min(count, unassignedCount))}
                  >
                    {count === unassignedCount ? 'All' : count}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.min(selectedLeadCount, unassignedCount)} of {unassignedCount} leads will be assigned
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Distribution Preview:</label>
              <ScrollArea className="h-48 border rounded-md p-2">
                {distributionPreview.map(({ agent, newLeads, newTotal }) => (
                  <div key={agent.userId} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={agent.avatarUrl || ''} />
                        <AvatarFallback className="text-xs">
                          {getInitials(agent.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{agent.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {agent.totalLeads}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">
                        +{newLeads} = {newTotal}
                      </Badge>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoAssignPreview(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAutoAssign}
              disabled={autoAssignMutation.isPending || selectedLeadCount === 0}
            >
              {autoAssignMutation.isPending ? 'Assigning...' : `Assign ${Math.min(selectedLeadCount, unassignedCount)} Leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

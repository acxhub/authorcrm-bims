import React, { useState } from 'react';
import { Users, AlertTriangle, Eye, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AgentWorkload } from '@/lib/api/leadManagerMetrics';
import { LeadsModal } from './LeadsModal';
import { useUpdateLead } from '@/hooks/useLeads';
import { useUsersContext } from '@/contexts/UsersContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AgentWorkloadSectionProps {
  agentWorkloads: AgentWorkload[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AgentWorkloadSection: React.FC<AgentWorkloadSectionProps> = ({
  agentWorkloads,
  isLoading,
  onRefresh,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignFromAgent, setReassignFromAgent] = useState<string>('');
  const [reassignToAgent, setReassignToAgent] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  
  const { activeUsers } = useUsersContext();
  const { toast } = useToast();

  const selectedAgent = agentWorkloads.find(a => a.userId === selectedAgentId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleReassignAll = async () => {
    if (!reassignFromAgent || !reassignToAgent) return;

    setIsReassigning(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: reassignToAgent,
          assigned_at: new Date().toISOString(),
        })
        .eq('assigned_to', reassignFromAgent)
        .is('deleted_at', null);

      if (error) throw error;

      const fromAgent = agentWorkloads.find(a => a.userId === reassignFromAgent);
      const toAgent = agentWorkloads.find(a => a.userId === reassignToAgent);

      toast({
        title: 'Leads Reassigned',
        description: `All leads from ${fromAgent?.fullName} reassigned to ${toAgent?.fullName}`,
      });

      setIsReassignDialogOpen(false);
      setReassignFromAgent('');
      setReassignToAgent('');
      onRefresh();
    } catch (error) {
      console.error('Reassign failed:', error);
      toast({
        title: 'Reassign Failed',
        description: 'Failed to reassign leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Separate active and inactive agents
  const activeAgents = agentWorkloads.filter(a => a.isActive);
  const inactiveAgents = agentWorkloads.filter(a => !a.isActive && a.totalLeads > 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Workload
            </CardTitle>
            <CardDescription>
              Lead distribution across {activeAgents.length} active agents
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsReassignDialogOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Bulk Reassign
          </Button>
        </CardHeader>
        <CardContent>
          {inactiveAgents.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Inactive Agents with Leads
              </div>
              <p className="text-sm text-red-600 mb-2">
                The following inactive agents still have leads assigned. Consider reassigning them.
              </p>
              <div className="flex flex-wrap gap-2">
                {inactiveAgents.map(agent => (
                  <Badge 
                    key={agent.userId} 
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => setSelectedAgentId(agent.userId)}
                  >
                    {agent.fullName}: {agent.totalLeads} leads
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead>By Status</TableHead>
                <TableHead className="text-right">Tagged</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentWorkloads.map((agent) => (
                <TableRow 
                  key={agent.userId}
                  className={!agent.isActive ? 'bg-red-50' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={agent.avatarUrl || ''} />
                        <AvatarFallback>{getInitials(agent.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{agent.fullName}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {agent.role.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {agent.totalLeads.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {agent.leadsByStatus.slice(0, 3).map((status) => (
                        <Tooltip key={status.statusId}>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                backgroundColor: `${status.color}20`,
                                color: status.color,
                                borderColor: status.color,
                              }}
                            >
                              {status.count}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {status.statusName}: {status.count} leads
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {agent.leadsByStatus.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{agent.leadsByStatus.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {agent.leadsWithTags} / {agent.totalLeads}
                  </TableCell>
                  <TableCell>
                    {agent.lastActivityDate ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(agent.lastActivityDate), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAgentId(agent.userId)}
                      disabled={agent.totalLeads === 0}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {agentWorkloads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No agents found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Modal for selected agent */}
      <LeadsModal
        open={!!selectedAgentId}
        onClose={() => setSelectedAgentId(null)}
        title={`Leads for ${selectedAgent?.fullName || 'Agent'}`}
        description={`${selectedAgent?.totalLeads || 0} leads assigned`}
        filterType="by-agent"
        agentId={selectedAgentId || undefined}
      />

      {/* Bulk Reassign Dialog */}
      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Reassign Leads</DialogTitle>
            <DialogDescription>
              Transfer all leads from one agent to another
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>From Agent:</Label>
              <Select value={reassignFromAgent} onValueChange={setReassignFromAgent}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select source agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agentWorkloads
                    .filter(a => a.totalLeads > 0)
                    .map((agent) => (
                      <SelectItem key={agent.userId} value={agent.userId}>
                        <div className="flex items-center gap-2">
                          <span>{agent.fullName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {agent.totalLeads} leads
                          </Badge>
                          {!agent.isActive && (
                            <Badge variant="destructive" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Agent:</Label>
              <Select 
                value={reassignToAgent} 
                onValueChange={setReassignToAgent}
                disabled={!reassignFromAgent}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select destination agent..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents
                    .filter(a => a.userId !== reassignFromAgent)
                    .map((agent) => (
                      <SelectItem key={agent.userId} value={agent.userId}>
                        <div className="flex items-center gap-2">
                          <span>{agent.fullName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {agent.totalLeads} leads
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {reassignFromAgent && reassignToAgent && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>Preview:</strong> {agentWorkloads.find(a => a.userId === reassignFromAgent)?.totalLeads || 0} leads 
                will be transferred from {agentWorkloads.find(a => a.userId === reassignFromAgent)?.fullName} to {agentWorkloads.find(a => a.userId === reassignToAgent)?.fullName}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)} disabled={isReassigning}>
                Cancel
              </Button>
              <Button 
                onClick={handleReassignAll} 
                disabled={!reassignFromAgent || !reassignToAgent || isReassigning}
              >
                {isReassigning ? 'Reassigning...' : 'Reassign All'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { PipelineColumn } from './PipelineColumn';
import { PipelineLeadCard } from './PipelineLeadCard';
import { MoveLeadModal } from './MoveLeadModal';
import { StatusManagement } from '@/components/admin/StatusManagement';
import { useLeads } from '@/hooks/useLeads';
import { useStatuses } from '@/hooks/useStatuses';
import { useUpdateLead } from '@/hooks/useLeads';
import { useCreateActivity } from '@/hooks/useActivities';
import type { Lead } from '@/lib/api/leads';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, RefreshCw } from 'lucide-react';

export const PipelineBoard: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [showStatusManagement, setShowStatusManagement] = useState(false);
  const [moveData, setMoveData] = useState<{
    lead: Lead;
    fromStatus: string;
    toStatus: string;
  } | null>(null);

  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useLeads({}, 1, 1000);
  const { data: statuses, isLoading: statusesLoading, refetch: refetchStatuses } = useStatuses();
  const updateLead = useUpdateLead();
  const createActivity = useCreateActivity();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    if (!leadsData?.data || !statuses) return {};
    
    const grouped: Record<string, Lead[]> = {};
    
    // Initialize all statuses with empty arrays
    statuses.forEach(status => {
      grouped[status.id] = [];
    });
    
    // Group leads by their status
    leadsData.data.forEach(lead => {
      if (grouped[lead.status_id]) {
        grouped[lead.status_id].push(lead);
      }
    });
    
    return grouped;
  }, [leadsData?.data, statuses]);

  // Get the active lead being dragged
  const activeLead = useMemo(() => {
    if (!activeId || !leadsData?.data) return null;
    return leadsData.data.find(lead => lead.id === activeId) || null;
  }, [activeId, leadsData?.data]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !active) return;

    const leadId = active.id as string;
    const newStatusId = over.id as string;
    
    const lead = leadsData?.data.find(l => l.id === leadId);
    const newStatus = statuses?.find(s => s.id === newStatusId);
    
    if (!lead || !newStatus || lead.status_id === newStatusId) return;

    // Open confirmation modal for status change
    setMoveData({
      lead,
      fromStatus: lead.status.name,
      toStatus: newStatus.name,
    });
    setMoveModalOpen(true);
  };

  const handleConfirmMove = async (note?: string) => {
    if (!moveData) return;

    try {
      const newStatusId = statuses?.find(s => s.name === moveData.toStatus)?.id || moveData.lead.status_id;
      
      // Update the lead status
      await updateLead.mutateAsync({
        id: moveData.lead.id,
        data: {
          status_id: newStatusId,
        },
      });
      
      // Log the activity using the enhanced API
      await createActivity.mutateAsync({
        lead_id: moveData.lead.id,
        activity_type: 'status_change',
        activity_date: new Date().toISOString(),
        summary: `Status changed from "${moveData.fromStatus}" to "${moveData.toStatus}"`,
        outcome: note || null,
      });
      
      setMoveModalOpen(false);
      setMoveData(null);
    } catch (error) {
      console.error('Failed to move lead:', error);
    }
  };

  const handleCancelMove = () => {
    setMoveModalOpen(false);
    setMoveData(null);
  };

  const handleStatusesUpdated = async () => {
    await refetchStatuses();
    await refetchLeads();
    setShowStatusManagement(false);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchStatuses(), refetchLeads()]);
  };

  if (leadsLoading || statusesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show status management if no statuses or user explicitly wants to manage them
  if (!statuses?.length || showStatusManagement) {
    return (
      <div className="space-y-6">
        {statuses?.length > 0 && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Pipeline Status Configuration</h3>
            <Button 
              variant="outline" 
              onClick={() => setShowStatusManagement(false)}
            >
              Back to Pipeline
            </Button>
          </div>
        )}
        <StatusManagement onStatusesUpdated={handleStatusesUpdated} />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Sales Pipeline</h3>
          <div className="text-sm text-gray-600">
            {leadsData?.data?.length || 0} total leads across {statuses.length} stages
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={leadsLoading || statusesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(leadsLoading || statusesLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowStatusManagement(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Statuses
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          <SortableContext items={statuses.map(s => s.id)}>
            {statuses
              .sort((a, b) => a.order_index - b.order_index)
              .map((status) => (
                <PipelineColumn
                  key={status.id}
                  status={status}
                  leads={leadsByStatus[status.id] || []}
                />
              ))}
          </SortableContext>
        </div>

        {createPortal(
          <DragOverlay>
            {activeLead && (
              <PipelineLeadCard lead={activeLead} isDragging />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <MoveLeadModal
        open={moveModalOpen}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
        fromStatus={moveData?.fromStatus || ''}
        toStatus={moveData?.toStatus || ''}
        leadTitle={moveData?.lead.book_title || ''}
        isLoading={updateLead.isPending || createActivity.isPending}
      />
    </>
  );
}; 
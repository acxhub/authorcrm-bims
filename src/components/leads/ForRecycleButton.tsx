import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useManageLeadTags } from '@/hooks/useLeads';
import { notify } from '@/lib/notifications/notify';
import type { Lead } from '@/lib/api/leads';
import type { Tag } from '@/lib/api/tags';
import { canRecycleLead } from '@/lib/permissions';

interface ForRecycleButtonProps {
  lead: Lead;
  onAssignmentChange?: (assignedTo: string | null) => void;
  onTagsChange?: (tags: Tag[]) => void;
}

export const ForRecycleButton: React.FC<ForRecycleButtonProps> = ({
  lead,
  onAssignmentChange,
  onTagsChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { removeTags } = useManageLeadTags();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  if (!canRecycleLead(profile, lead.assigned_to, user?.id)) {
    return null;
  }

  const handleForRecycle = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('recycle_lead', { lead_id: lead.id });
      if (error) throw error;

      // Clear tags per FR-002 (DB function does not clear tags)
      const tagIds = lead.tags?.map((t) => t.id) ?? [];
      if (tagIds.length > 0) {
        await removeTags.mutateAsync({ leadId: lead.id, tagIds });
      }

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      onAssignmentChange?.(null);
      onTagsChange?.([]);
      toast({
        title: 'Success',
        description: 'Lead has been recycled and is ready for reassignment.',
      });

      if (user?.id) {
        notify.leadRecycled({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          lead: { id: lead.id, book_title: lead.book_title },
          previousAssigneeId: lead.assigned_to || null,
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to recycle lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleForRecycle}
      disabled={isLoading}
      className="w-full h-8 text-purple-600 hover:text-purple-700 border-purple-200 hover:bg-purple-50"
    >
      <RotateCcw className="h-3 w-3 mr-1" />
      {isLoading ? 'Processing...' : 'For Recycle'}
    </Button>
  );
};

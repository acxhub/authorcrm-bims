import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateLead, useManageLeadTags } from '@/hooks/useLeads';
import { useCreateActivity } from '@/hooks/useActivities';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/api/leads';
import type { Tag } from '@/lib/api/tags';

interface ForRecycleButtonProps {
  lead: Lead;
  onAssignmentChange?: (assignedTo: string | null) => void;
  onTagsChange?: (tags: Tag[]) => void;
}

export const ForRecycleButton: React.FC<ForRecycleButtonProps> = ({
  lead,
  onAssignmentChange,
  onTagsChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { users } = useUsers({}, 1, 1000);
  const { data: allTags } = useTags();
  const updateLead = useUpdateLead();
  const { addTags } = useManageLeadTags();
  const createActivity = useCreateActivity();
  const { toast } = useToast();

  const handleForRecycle = async () => {
    setIsLoading(true);
    
    try {
      // Debug: Log all users to console
      console.log('All users:', users?.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        is_active: u.is_active
      })));

      // Find Lead Sup. user by UID or email
      const leadSupUser = users?.find(u => 
        (u.id === 'b1e029c4-b048-4a51-9ab9-00e6e70b28f6' || 
         u.email === 'jasondaniels.golfstyles@gmail.com') &&
        u.is_active
      );

      console.log('Found Lead Sup user:', leadSupUser);

      if (!leadSupUser) {
        toast({
          title: 'Error',
          description: 'Lead Sup. not found in the system. Check console for user list.',
          variant: 'destructive',
        });
        return;
      }

      // Find or create "For Recycle" tag
      let forRecycleTag = allTags?.find(tag => 
        tag.name.toLowerCase() === 'for recycle' && tag.is_active
      );

      // If tag doesn't exist, we'll create it through the API
      if (!forRecycleTag) {
        // Import tags API to create the tag
        const { tagsApi } = await import('@/lib/api/tags');
        forRecycleTag = await tagsApi.createTag({
          name: 'For Recycle',
          color: '#8B5CF6',
          description: 'Lead marked for recycling process',
          is_active: true
        });
      }

      // Update lead assignment to Lead Sup
      await updateLead.mutateAsync({
        id: lead.id,
        data: { assigned_to: leadSupUser.id }
      });

      // Add "For Recycle" tag to the lead
      if (forRecycleTag && !lead.tags?.some(tag => tag.id === forRecycleTag.id)) {
        await addTags.mutateAsync({ 
          leadId: lead.id, 
          tagIds: [forRecycleTag.id] 
        });
        
        // Update local tags state
        const updatedTags = [...(lead.tags || []), forRecycleTag];
        onTagsChange?.(updatedTags);
      }

      // Log the activity
      await createActivity.mutateAsync({
        lead_id: lead.id,
        user_id: user?.id || '',
        activity_type: 'assignment',
        summary: 'Lead marked for recycle',
        outcome: `Lead assigned to ${leadSupUser.full_name || 'Lead Sup'} and tagged as "For Recycle"`,
      });

      // Update local assignment state
      onAssignmentChange?.(leadSupUser.id);

      toast({
        title: 'Success',
        description: `Lead has been assigned to ${leadSupUser.full_name || 'Lead Sup'} for recycling`,
      });

    } catch (error) {
      console.error('For Recycle failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark lead for recycle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if already assigned to Lead Sup and has For Recycle tag
  const leadSupUser = users?.find(u => 
    (u.id === 'b1e029c4-b048-4a51-9ab9-00e6e70b28f6' || 
     u.email === 'jasondaniels.golfstyles@gmail.com') &&
    u.is_active
  );
  
  const hasForRecycleTag = lead.tags?.some(tag => 
    tag.name.toLowerCase() === 'for recycle'
  );
  
  const isAssignedToLeadSup = lead.assigned_to === leadSupUser?.id;
  
  if (isAssignedToLeadSup && hasForRecycleTag) {
    return null; // Don't show button if already recycled
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleForRecycle}
      disabled={isLoading || updateLead.isPending || addTags.isPending}
      className="w-full h-8 text-purple-600 hover:text-purple-700 border-purple-200 hover:bg-purple-50"
    >
      <RotateCcw className="h-3 w-3 mr-1" />
      {isLoading ? 'Processing...' : 'For Recycle'}
    </Button>
  );
};
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeadForm } from './LeadForm';
import { useCreateLead } from '@/hooks/useLeads';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth, useProfile } from '@/hooks/useAuth';
import type { CreateLeadData } from '@/lib/api/leads';

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const createLead = useCreateLead();
  const notifications = useNotifications();

  const handleSubmit = async (data: CreateLeadData) => {
    try {
      // Set the creator - this is required for the auto-assignment trigger
      if (user?.id) {
        data.created_by = user.id;
      }

      // Note: For sales agents, assignment will be handled automatically by the database trigger
      await createLead.mutateAsync(data);
      
      notifications.addNotification({
        type: 'success',
        title: 'Lead created successfully',
        message: profile?.role === 'sales' ? 'Lead has been automatically assigned to you' : undefined,
      });
      
      onClose();
    } catch (error) {
      notifications.addNotification({
        type: 'error',
        title: 'Failed to create lead',
        message: 'Please try again',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
        </DialogHeader>
        <LeadForm
          onSubmit={handleSubmit}
          isLoading={createLead.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}; 
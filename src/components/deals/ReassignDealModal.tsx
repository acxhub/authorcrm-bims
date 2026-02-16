import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateDeal } from '@/hooks/useDeals';
import { useLogActivity } from '@/hooks/useActivities';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useUsersContext } from '@/contexts/UsersContext';
import { notify, getManagers } from '@/lib/notifications/notify';
import type { Deal } from '@/lib/api/deals';

const reassignSchema = z.object({
  assigned_to: z.string().min(1, 'Please select a user'),
  notes: z.string().optional(),
});

type ReassignFormData = z.infer<typeof reassignSchema>;

interface ReassignDealModalProps {
  open: boolean;
  onClose: () => void;
  deal: Deal | null;
}

export const ReassignDealModal: React.FC<ReassignDealModalProps> = ({
  open,
  onClose,
  deal,
}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { users } = useUsers({}, 1, 1000); // Fetch all users for assignment dropdown
  const { users: allUsers } = useUsersContext();
  const updateDealMutation = useUpdateDeal();
  const logActivityMutation = useLogActivity();

  const form = useForm<ReassignFormData>({
    resolver: zodResolver(reassignSchema),
    defaultValues: {
      assigned_to: deal?.assigned_to || '',
      notes: '',
    },
  });

  const onSubmit = async (data: ReassignFormData) => {
    if (!deal || !user) return;

    try {
      // Update the deal assignment
      await updateDealMutation.mutateAsync({
        id: deal.id,
        data: {
          assigned_to: data.assigned_to,
        },
      });

      // Log the reassignment activity
      const assignedUser = users?.find(u => u.id === data.assigned_to);
      const previousUser = users?.find(u => u.id === deal.assigned_to);
      
      await logActivityMutation.mutateAsync({
        leadId: deal.lead_id,
        userId: user.id,
        activityType: 'assignment',
        summary: `Deal reassigned from ${previousUser?.full_name || 'Unassigned'} to ${assignedUser?.full_name || 'Unknown'}`,
        outcome: data.notes || undefined,
      });

      // Send notification for deal reassignment
      if (user?.id) {
        notify.dealAssigned({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          deal: { id: deal.id, offer_title: deal.offer_title },
          newAssigneeId: data.assigned_to,
          previousAssigneeId: deal.assigned_to || null,
          managers: getManagers(allUsers),
        });
      }

      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to reassign deal:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Deal</DialogTitle>
          <DialogDescription>
            Reassign "{deal.offer_title}" to a different team member.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note about this reassignment..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateDealMutation.isPending || logActivityMutation.isPending}
              >
                {updateDealMutation.isPending || logActivityMutation.isPending ? 'Reassigning...' : 'Reassign Deal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 
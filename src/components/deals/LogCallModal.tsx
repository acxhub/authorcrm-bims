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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLogActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import type { Deal } from '@/lib/api/deals';
import { getLeadDisplayName } from '@/lib/lead-display';

const logCallSchema = z.object({
  summary: z.string().min(1, 'Please provide a call summary'),
  outcome: z.string().optional(),
  duration: z.string().optional(),
});

type LogCallFormData = z.infer<typeof logCallSchema>;

interface LogCallModalProps {
  open: boolean;
  onClose: () => void;
  deal: Deal | null;
}

export const LogCallModal: React.FC<LogCallModalProps> = ({
  open,
  onClose,
  deal,
}) => {
  const { user } = useAuth();
  const logActivityMutation = useLogActivity();

  const form = useForm<LogCallFormData>({
    resolver: zodResolver(logCallSchema),
    defaultValues: {
      summary: '',
      outcome: '',
      duration: '',
    },
  });

  const onSubmit = async (data: LogCallFormData) => {
    if (!deal || !user) return;

    try {
      const summary = data.duration 
        ? `Call (${data.duration}): ${data.summary}`
        : `Call: ${data.summary}`;

      await logActivityMutation.mutateAsync({
        leadId: deal.lead_id,
        userId: user.id,
        activityType: 'call',
        summary,
        outcome: data.outcome || undefined,
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to log call:', error);
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
          <DialogTitle>Log Call</DialogTitle>
          <DialogDescription>
            Record details about your call with{' '}
            {deal.lead ? getLeadDisplayName(deal.lead) : 'the author'}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Summary *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What was discussed during the call?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 30 minutes, 1 hour"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome/Next Steps (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are the next steps or outcomes from this call?"
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
                disabled={logActivityMutation.isPending}
              >
                {logActivityMutation.isPending ? 'Logging...' : 'Log Call'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 
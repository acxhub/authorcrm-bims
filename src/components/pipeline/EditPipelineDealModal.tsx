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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useStatuses } from '@/hooks/useStatuses';
import { useUsers } from '@/hooks/useUsers';
import type { Deal, UpdateDealData } from '@/lib/api/deals';

const pipelineDealSchema = z.object({
  offer_title: z.string().min(1, 'Offer title is required'),
  deal_value: z.number().min(0, 'Deal value must be positive'),
  category: z.enum(['Publishing', 'Marketing', 'Event']),
  status_id: z.string().min(1, 'Status is required'),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().optional(),
});

type PipelineDealFormData = z.infer<typeof pipelineDealSchema>;

interface EditPipelineDealModalProps {
  open: boolean;
  onClose: () => void;
  deal: Deal | null;
  onSave: (data: UpdateDealData) => void;
  isLoading?: boolean;
}

export const EditPipelineDealModal: React.FC<EditPipelineDealModalProps> = ({
  open,
  onClose,
  deal,
  onSave,
  isLoading = false,
}) => {
  const { data: statuses = [] } = useStatuses();
  const { users = [] } = useUsers();

  const form = useForm<PipelineDealFormData>({
    resolver: zodResolver(pipelineDealSchema),
    defaultValues: {
      offer_title: deal?.offer_title || '',
      deal_value: deal?.deal_value || 0,
      category: (deal?.category as 'Publishing' | 'Marketing' | 'Event') || 'Publishing',
      status_id: deal?.status_id || '',
      assigned_to: deal?.assigned_to || undefined,
      notes: deal?.notes || '',
    },
  });

  React.useEffect(() => {
    if (deal) {
      form.reset({
        offer_title: deal.offer_title || '',
        deal_value: deal.deal_value || 0,
        category: (deal.category as 'Publishing' | 'Marketing' | 'Event') || 'Publishing',
        status_id: deal.status_id || '',
        assigned_to: deal.assigned_to || undefined,
        notes: deal.notes || '',
      });
    }
  }, [deal, form]);

  const handleSubmit = (data: PipelineDealFormData) => {
    onSave({
      offer_title: data.offer_title,
      deal_value: data.deal_value,
      category: data.category,
      status_id: data.status_id,
      assigned_to: data.assigned_to || null,
      notes: data.notes || null,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Pipeline Deal</DialogTitle>
          <DialogDescription>
            Update deal information for "{deal.offer_title}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Deal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="offer_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Publishing Package - Premium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deal_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Value *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input 
                          type="number" 
                          placeholder="10000" 
                          className="pl-8"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Publishing">📚 Publishing</SelectItem>
                        <SelectItem value="Marketing">📢 Marketing</SelectItem>
                        <SelectItem value="Event">🎤 Event</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : value)} value={field.value || "unassigned"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this deal..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deal Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Deal Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Value:</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(form.watch('deal_value') || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <p className="font-medium">{form.watch('category')}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 
import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStatuses } from '@/hooks/useStatuses';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import type { CreateDealData } from '@/lib/api/deals';
import type { Lead } from '@/lib/api/leads';

const createDealSchema = z.object({
  author_name: z.string().min(1, 'Author name is required'),
  offer_title: z.string().min(1, 'Offer title is required'),
  deal_value: z.number().min(0, 'Deal value must be positive'),
  category: z.enum(['Publishing', 'Marketing', 'Event']),
  assigned_to: z.string().optional().nullable(),
});

type CreateDealFormData = z.infer<typeof createDealSchema>;

interface CreateDealModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateDealData) => void;
  isLoading?: boolean;
  initialData?: Partial<CreateDealFormData>;
}

export const CreateDealModal: React.FC<CreateDealModalProps> = ({
  open,
  onClose,
  onSave,
  isLoading = false,
  initialData,
}) => {
  const { user } = useAuth();
  const { data: statuses = [] } = useStatuses();
  const { users = [] } = useUsers();
  const { data: leadsData } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [authorSearchOpen, setAuthorSearchOpen] = useState(false);

  // Check if user is sales manager
  const isSalesManager = user?.role === 'sales_manager';

  const form = useForm<CreateDealFormData>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      author_name: initialData?.author_name || '',
      offer_title: initialData?.offer_title || '',
      deal_value: initialData?.deal_value || 0,
      category: initialData?.category || 'Publishing',
      assigned_to: initialData?.assigned_to || user?.id,
    },
  });

  const watchedAuthorName = form.watch('author_name');

  // Auto-populate fields when author is selected
  useEffect(() => {
    if (watchedAuthorName && leadsData?.data) {
      const matchingLead = leadsData.data.find(
        lead => lead.author_name.toLowerCase().includes(watchedAuthorName.toLowerCase())
      );
      
      if (matchingLead) {
        setSelectedLead(matchingLead);
        // Auto-populate offer title if not already set
        if (!form.getValues('offer_title')) {
          form.setValue('offer_title', `${matchingLead.book_title} - Publishing Package`);
        }
      }
    }
  }, [watchedAuthorName, leadsData, form]);

  const handleSubmit = (data: CreateDealFormData) => {
    if (!selectedLead) {
      // If no matching lead found, we might need to create one or show an error
      alert('Please select a valid author from the existing leads.');
      return;
    }

    // Get the New Deal status as default
    const newDealStatus = statuses.find(s => s.name === 'New Deal');
    if (!newDealStatus) {
      alert('New Deal status not found. Please contact an administrator.');
      return;
    }

    const createData: CreateDealData = {
      lead_id: selectedLead.id,
      offer_title: data.offer_title,
      deal_value: data.deal_value,
      category: data.category,
      status_id: newDealStatus.id,
      assigned_to: data.assigned_to || user?.id || null,
      created_by: user?.id || '',
    };

    onSave(createData);
  };

  const handleClose = () => {
    form.reset();
    setSelectedLead(null);
    setAuthorSearchOpen(false);
    onClose();
  };

  // Get unique author names from leads
  const authorOptions = leadsData?.data?.map(lead => ({
    value: lead.author_name,
    label: `${lead.author_name} - ${lead.book_title}`,
    lead: lead
  })) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Create a new deal opportunity for an existing author
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Author Selection */}
            <FormField
              control={form.control}
              name="author_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author Name *</FormLabel>
                  <Popover open={authorSearchOpen} onOpenChange={setAuthorSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={authorSearchOpen}
                          className="w-full justify-between"
                        >
                          {field.value
                            ? authorOptions.find((option) => option.value === field.value)?.label
                            : "Search and select an author..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search authors..." />
                        <CommandList>
                          <CommandEmpty>No author found.</CommandEmpty>
                          <CommandGroup>
                            {authorOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                  field.onChange(option.value);
                                  setSelectedLead(option.lead);
                                  form.setValue('offer_title', `${option.lead.book_title} - Publishing Package`);
                                  setAuthorSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === option.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show selected lead info */}
            {selectedLead && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Book:</span>
                    <p className="font-medium">
                      {selectedLead.book_title && selectedLead.book_title.length > 24 ? (
                        <span title={selectedLead.book_title}>{selectedLead.book_title.slice(0, 24) + '…'}</span>
                      ) : (
                        <span title={selectedLead.book_title}>{selectedLead.book_title}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedLead.primary_email || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Offer Title */}
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

            {/* Deal Value and Category */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Assignment (only for sales managers) */}
            {isSalesManager && (
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "unassigned" ? null : value)} 
                      value={field.value || "unassigned"}
                    >
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
            )}

            {/* Show current assignment for non-sales managers */}
            {!isSalesManager && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Assigned to:</strong> {user?.email || 'You'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Only Sales Managers can change deal assignment
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedLead}>
                {isLoading ? 'Creating...' : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 
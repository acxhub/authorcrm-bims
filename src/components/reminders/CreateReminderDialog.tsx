import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, Check, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useCreateReminder, useUpdateReminder } from '@/hooks/useReminders';
import type { Reminder } from '@/lib/api/reminders';

interface CreateReminderDialogProps {
  open: boolean;
  onClose: () => void;
  defaultLeadId?: string;
  reminder?: Reminder;
}

export const CreateReminderDialog: React.FC<CreateReminderDialogProps> = ({
  open,
  onClose,
  defaultLeadId,
  reminder,
}) => {
  const { user } = useAuth();
  const createMutation = useCreateReminder();
  const updateMutation = useUpdateReminder();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState('medium');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isEditing = !!reminder;

  const { data: leadsData } = useLeads(
    leadSearchTerm ? { search: leadSearchTerm } : {},
    1,
    20
  );
  const leads = leadsData?.data || [];

  useEffect(() => {
    if (open) {
      if (reminder) {
        setTitle(reminder.title);
        setNotes(reminder.notes || '');
        setDueDate(reminder.due_date ? new Date(reminder.due_date + 'T00:00:00') : undefined);
        setPriority(reminder.priority || 'medium');
        setLeadId(reminder.lead_id);
      } else {
        setTitle('');
        setNotes('');
        setDueDate(undefined);
        setPriority('medium');
        setLeadId(defaultLeadId || null);
      }
      setLeadSearchTerm('');
    }
  }, [open, reminder, defaultLeadId]);

  const selectedLead = useMemo(() => {
    if (!leadId) return null;
    // Try to find in search results first, fall back to reminder's lead data (edit mode)
    const fromSearch = leads.find(l => l.id === leadId);
    if (fromSearch) return fromSearch;
    if (reminder?.lead && reminder.lead_id === leadId) return reminder.lead;
    return null;
  }, [leadId, leads, reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user?.id) return;

    const data = {
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      priority,
      lead_id: leadId,
    };

    try {
      if (isEditing && reminder) {
        await updateMutation.mutateAsync({ id: reminder.id, data });
      } else {
        await createMutation.mutateAsync({ ...data, user_id: user.id });
      }
      onClose();
    } catch {
      // Error is handled by mutation's onError / toast
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Reminder' : 'New Reminder'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              maxLength={500}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-notes">Notes</Label>
            <Textarea
              id="reminder-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details..."
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                  />
                  {dueDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          setDueDate(undefined);
                          setCalendarOpen(false);
                        }}
                      >
                        <X className="mr-2 h-3 w-3" /> Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-400" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      High
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Linked Lead</Label>
            <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !leadId && 'text-muted-foreground'
                  )}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {selectedLead
                    ? (selectedLead.author_name || `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim() || 'Unknown Lead')
                    : leadId
                      ? 'Loading...'
                      : 'No lead linked'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Search leads by name, book, email..."
                      value={leadSearchTerm}
                      onChange={(e) => setLeadSearchTerm(e.target.value)}
                    />
                  </div>
                  <CommandList>
                    <CommandEmpty>No leads found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setLeadId(null);
                          setLeadSearchOpen(false);
                          setLeadSearchTerm('');
                        }}
                      >
                        <span className="text-gray-500">No lead</span>
                        <Check className={cn('ml-auto h-4 w-4', !leadId ? 'opacity-100' : 'opacity-0')} />
                      </CommandItem>
                      {leads.map((lead) => (
                        <CommandItem
                          key={lead.id}
                          onSelect={() => {
                            setLeadId(lead.id);
                            setLeadSearchOpen(false);
                            setLeadSearchTerm('');
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {lead.author_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'}
                            </div>
                            {lead.book_title && (
                              <div className="text-xs text-gray-500 truncate">{lead.book_title}</div>
                            )}
                          </div>
                          <Check className={cn('ml-auto h-4 w-4 flex-shrink-0', leadId === lead.id ? 'opacity-100' : 'opacity-0')} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

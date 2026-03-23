import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Plus, ChevronDown, ChevronRight, BookOpen, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isBefore, startOfToday, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useReminders, useToggleReminder, useDeleteReminder } from '@/hooks/useReminders';
import { CreateReminderDialog } from './CreateReminderDialog';
import type { Reminder } from '@/lib/api/reminders';
import { getLeadDisplayName } from '@/lib/lead-display';

interface RemindersListProps {
  userId: string;
  leadId?: string;
  compact?: boolean;
  maxItems?: number;
  showCompleted?: boolean;
  onViewAll?: () => void;
  filter?: 'all' | 'overdue' | 'today' | 'upcoming';
}

function getDueDateInfo(dueDate: string | null): { label: string; color: string } | null {
  if (!dueDate) return null;
  const date = new Date(dueDate + 'T00:00:00');
  const today = startOfToday();
  const endOfWeek = addDays(today, 7);

  if (isBefore(date, today)) {
    return { label: `Overdue - ${format(date, 'MMM d')}`, color: 'bg-red-100 text-red-700 border-red-200' };
  }
  if (isToday(date)) {
    return { label: 'Today', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  }
  if (isBefore(date, endOfWeek)) {
    return { label: format(date, 'EEE, MMM d'), color: 'bg-blue-100 text-blue-700 border-blue-200' };
  }
  return { label: format(date, 'MMM d'), color: 'bg-gray-100 text-gray-600 border-gray-200' };
}

function getPriorityDot(priority: string | null): string {
  switch (priority) {
    case 'high': return 'bg-red-400';
    case 'medium': return 'bg-yellow-400';
    case 'low': return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
}

function categorizeReminders(reminders: Reminder[]) {
  const today = startOfToday();
  const overdue: Reminder[] = [];
  const todayItems: Reminder[] = [];
  const upcoming: Reminder[] = [];
  const noDue: Reminder[] = [];
  const completed: Reminder[] = [];

  for (const r of reminders) {
    if (r.is_completed) {
      completed.push(r);
      continue;
    }
    if (!r.due_date) {
      noDue.push(r);
      continue;
    }
    const date = new Date(r.due_date + 'T00:00:00');
    if (isBefore(date, today)) {
      overdue.push(r);
    } else if (isToday(date)) {
      todayItems.push(r);
    } else {
      upcoming.push(r);
    }
  }

  return { overdue, todayItems, upcoming, noDue, completed };
}

const ReminderRow: React.FC<{
  reminder: Reminder;
  onToggle: (id: string, isCompleted: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}> = ({ reminder, onToggle, onEdit, onDelete, compact }) => {
  const navigate = useNavigate();
  const dueDateInfo = getDueDateInfo(reminder.due_date);
  const priorityDot = getPriorityDot(reminder.priority);

  return (
    <div className={cn(
      'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-50/80',
      reminder.is_completed && 'opacity-60'
    )}>
      <Checkbox
        checked={reminder.is_completed}
        onCheckedChange={(checked) => onToggle(reminder.id, !!checked)}
        className="mt-0.5 h-[18px] w-[18px] rounded-full border-2"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', priorityDot)} />
          <span className={cn(
            'text-sm font-medium truncate',
            reminder.is_completed && 'line-through text-gray-400'
          )}>
            {reminder.title}
          </span>
        </div>
        {!compact && reminder.notes && (
          <p className="text-xs text-gray-500 mt-0.5 truncate ml-4">
            {reminder.notes}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 ml-4">
          {dueDateInfo && !reminder.is_completed && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', dueDateInfo.color)}>
              {dueDateInfo.label}
            </Badge>
          )}
          {reminder.lead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/leads/${reminder.lead_id}`);
              }}
              className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
            >
              <BookOpen className="h-3 w-3" />
              {getLeadDisplayName(reminder.lead)}
            </button>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(reminder)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(reminder.id)} className="text-red-600">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const SectionHeader: React.FC<{
  label: string;
  count: number;
  color?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ label, count, color = 'text-gray-500', collapsible = false, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div>
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider w-full text-left',
          color,
          collapsible && 'cursor-pointer hover:bg-gray-50 rounded'
        )}
      >
        {collapsible && (
          isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
        )}
        {label}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
          {count}
        </Badge>
      </button>
      {isOpen && children}
    </div>
  );
};

export const RemindersList: React.FC<RemindersListProps> = ({
  userId,
  leadId,
  compact = false,
  maxItems,
  showCompleted = true,
  onViewAll,
  filter = 'all',
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();

  const filters = {
    user_id: userId,
    ...(leadId ? { lead_id: leadId } : {}),
    ...(!showCompleted ? { is_completed: false as const } : {}),
  };

  const { data: remindersData, isLoading } = useReminders(filters, 1, maxItems || 100);
  const toggleMutation = useToggleReminder();
  const deleteMutation = useDeleteReminder();

  const allReminders = remindersData?.data || [];
  const { overdue, todayItems, upcoming, noDue, completed } = useMemo(
    () => categorizeReminders(allReminders),
    [allReminders]
  );

  const handleToggle = (id: string, isCompleted: boolean) => {
    toggleMutation.mutate({ id, isCompleted });
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setEditingReminder(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeCount = overdue.length + todayItems.length + upcoming.length + noDue.length;

  const renderRow = (r: Reminder) => (
    <ReminderRow
      key={r.id}
      reminder={r}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onDelete={handleDelete}
      compact={compact}
    />
  );

  if (compact) {
    let allActive: Reminder[];
    switch (filter) {
      case 'overdue':
        allActive = overdue;
        break;
      case 'today':
        allActive = todayItems;
        break;
      case 'upcoming':
        allActive = [...upcoming, ...noDue];
        break;
      default:
        allActive = [...overdue, ...todayItems, ...upcoming, ...noDue];
    }
    const displayItems = maxItems ? allActive.slice(0, maxItems) : allActive;

    return (
      <>
        <div className="space-y-0.5">
          {displayItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-2">No reminders yet</p>
              <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Create one
              </Button>
            </div>
          )}
          {displayItems.map(renderRow)}
          {maxItems && allActive.length > maxItems && onViewAll && (
            <button
              onClick={onViewAll}
              className="block w-full text-center text-xs text-blue-600 hover:text-blue-800 py-2"
            >
              View all {allActive.length} reminders
            </button>
          )}
        </div>
        <CreateReminderDialog
          open={createDialogOpen}
          onClose={handleCloseDialog}
          defaultLeadId={leadId}
          reminder={editingReminder}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {activeCount} active
            </span>
            {completed.length > 0 && (
              <span className="text-xs text-gray-400">
                {completed.length} completed
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {activeCount === 0 && completed.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-3">No reminders yet</p>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Create your first reminder
            </Button>
          </div>
        )}

        <SectionHeader label="Overdue" count={overdue.length} color="text-red-600">
          <div className="space-y-0.5">{overdue.map(renderRow)}</div>
        </SectionHeader>

        <SectionHeader label="Today" count={todayItems.length} color="text-orange-600">
          <div className="space-y-0.5">{todayItems.map(renderRow)}</div>
        </SectionHeader>

        <SectionHeader label="Upcoming" count={upcoming.length + noDue.length} color="text-blue-600">
          <div className="space-y-0.5">
            {upcoming.map(renderRow)}
            {noDue.map(renderRow)}
          </div>
        </SectionHeader>

        {showCompleted && (
          <SectionHeader
            label="Completed"
            count={completed.length}
            color="text-gray-400"
            collapsible
            defaultOpen={false}
          >
            <div className="space-y-0.5">{completed.map(renderRow)}</div>
          </SectionHeader>
        )}
      </div>

      <CreateReminderDialog
        open={createDialogOpen}
        onClose={handleCloseDialog}
        defaultLeadId={leadId}
        reminder={editingReminder}
      />
    </>
  );
};

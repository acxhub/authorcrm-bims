import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckSquare, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { RemindersList } from '@/components/reminders/RemindersList';
import { CreateReminderDialog } from '@/components/reminders/CreateReminderDialog';
import { startOfToday, isBefore } from 'date-fns';

export const MyReminders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const userId = user?.id || '';

  // Use the same query as RemindersList so React Query deduplicates (shared cache key)
  const { data: remindersData, isLoading } = useReminders(
    { user_id: userId },
    1,
    100
  );

  const { activeCount, overdueCount } = useMemo(() => {
    const items = remindersData?.data || [];
    const today = startOfToday();
    let active = 0;
    let overdue = 0;
    for (const r of items) {
      if (!r.is_completed) {
        active++;
        if (r.due_date && isBefore(new Date(r.due_date + 'T00:00:00'), today)) {
          overdue++;
        }
      }
    }
    return { activeCount: active, overdueCount: overdue };
  }, [remindersData]);

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">My Reminders</CardTitle>
              <p className="text-sm text-gray-500">
                {activeCount} pending
                {overdueCount > 0 && (
                  <span className="ml-1 text-red-500 font-medium">
                    ({overdueCount} overdue)
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {userId ? (
          <RemindersList
            userId={userId}
            compact
            maxItems={8}
            onViewAll={() => navigate('/reminders')}
          />
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Please sign in to see your reminders.</p>
        )}
      </CardContent>

      <CreateReminderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Card>
  );
};

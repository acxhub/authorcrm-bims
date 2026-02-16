import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckSquare, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { RemindersList } from '@/components/reminders/RemindersList';
import { CreateReminderDialog } from '@/components/reminders/CreateReminderDialog';
import { startOfToday, isBefore, isToday, format } from 'date-fns';

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon: Icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200/60 hover:border-gray-300 hover:shadow-md transition-all ${color}`}
  >
    <Icon className="h-5 w-5" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export const ActionCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const userId = user?.id || '';

  const { data: remindersData, isLoading } = useReminders(
    { user_id: userId },
    1,
    100
  );

  const { overdueCount, todayCount, upcomingCount } = useMemo(() => {
    const items = remindersData?.data || [];
    const today = startOfToday();
    let overdue = 0;
    let todayTasks = 0;
    let upcoming = 0;

    for (const r of items) {
      if (!r.is_completed && r.due_date) {
        const dueDate = new Date(r.due_date + 'T00:00:00');
        if (isBefore(dueDate, today)) {
          overdue++;
        } else if (isToday(dueDate)) {
          todayTasks++;
        } else {
          upcoming++;
        }
      }
    }
    return { overdueCount: overdue, todayCount: todayTasks, upcomingCount: upcoming };
  }, [remindersData]);

  const totalPending = overdueCount + todayCount + upcomingCount;

  const quickActions = [
    { icon: Plus, label: 'Add Lead', onClick: () => navigate('/leads?action=create'), color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { icon: Phone, label: 'Log Call', onClick: () => navigate('/leads'), color: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { icon: Mail, label: 'Send Email', onClick: () => navigate('/leads'), color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { icon: Calendar, label: 'New Task', onClick: () => setCreateDialogOpen(true), color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  ];

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Action Center</CardTitle>
              <p className="text-sm text-gray-500">
                {totalPending} pending task{totalPending !== 1 ? 's' : ''}
                {overdueCount > 0 && (
                  <span className="ml-1 text-red-500 font-medium">
                    • {overdueCount} overdue
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action, i) => (
              <QuickAction key={i} {...action} />
            ))}
          </div>
        </div>

        {/* Tasks Tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="overdue" className="text-xs relative">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {overdueCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="today" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Today
                {todayCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-blue-100 text-blue-700">
                    {todayCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overdue" className="mt-3">
              {userId ? (
                <RemindersList
                  userId={userId}
                  compact
                  maxItems={5}
                  filter="overdue"
                  onViewAll={() => navigate('/reminders')}
                />
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Sign in to see tasks</p>
              )}
            </TabsContent>

            <TabsContent value="today" className="mt-3">
              {userId ? (
                <RemindersList
                  userId={userId}
                  compact
                  maxItems={5}
                  filter="today"
                  onViewAll={() => navigate('/reminders')}
                />
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Sign in to see tasks</p>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-3">
              {userId ? (
                <RemindersList
                  userId={userId}
                  compact
                  maxItems={5}
                  onViewAll={() => navigate('/reminders')}
                />
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Sign in to see tasks</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* View All Button */}
        <Button 
          variant="ghost" 
          className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => navigate('/reminders')}
        >
          View All Tasks
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>

      <CreateReminderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Card>
  );
};

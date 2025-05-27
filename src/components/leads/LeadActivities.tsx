import React, { useState } from 'react';
import { Activity as ActivityIcon, Plus, Phone, Mail, Calendar, FileText, UserCheck, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivitiesByLeadId, useCreateActivity, useLogActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/lib/api/leads';
import type { Activity } from '@/lib/api/activities';

interface LeadActivitiesProps {
  lead: Lead;
}

interface ActivityItemProps {
  activity: Activity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'assignment':
        return <UserCheck className="h-4 w-4" />;
      case 'status_change':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'email':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'meeting':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'note':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'assignment':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'status_change':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
        {getActivityIcon(activity.activity_type)}
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getActivityColor(activity.activity_type)}>
              {activity.activity_type.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}
            </span>
          </div>
          
          <Avatar className="h-6 w-6">
            <AvatarImage src="" />
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {getInitials(activity.user_profile?.full_name || 'U')}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div>
          <div className="font-medium text-sm text-gray-900">
            {activity.summary}
          </div>
          {activity.outcome && (
            <div className="text-sm text-gray-600 mt-1">
              {activity.outcome}
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          by {activity.user_profile?.full_name || 'Unknown User'}
        </div>
      </div>
    </div>
  );
};

export const LeadActivities: React.FC<LeadActivitiesProps> = ({ lead }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');
  const [activityType, setActivityType] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');

  const { user } = useAuth();
  const { data: activities, isLoading } = useActivitiesByLeadId(lead.id);
  const createActivity = useCreateActivity();
  const logActivity = useLogActivity();

  const handleQuickLog = async (type: 'call' | 'email' | 'meeting' | 'note', quickSummary: string) => {
    if (!user) return;
    
    try {
      await logActivity.mutateAsync({ 
        leadId: lead.id, 
        userId: user.id,
        activityType: type,
        summary: quickSummary 
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const handleCustomActivity = async () => {
    if (!activityType || !summary.trim() || !user) return;

    try {
      await createActivity.mutateAsync({
        lead_id: lead.id,
        user_id: user.id,
        activity_type: activityType as any,
        summary: summary.trim(),
        outcome: outcome.trim() || null,
      });
      
      // Reset form
      setActivityType('');
      setSummary('');
      setOutcome('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  };

  const isSubmitting = createActivity.isPending || logActivity.isPending;

  // Group activities by date
  const groupedActivities = (activities || []).reduce((groups, activity) => {
    const date = new Date(activity.activity_date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Activity Log ({activities?.length || 0})
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log New Activity</DialogTitle>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quick">Quick Log</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
                
                <TabsContent value="quick" className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => handleQuickLog('call', 'Made a phone call to the author')}
                      disabled={isSubmitting}
                    >
                      <Phone className="h-5 w-5" />
                      <span className="text-xs">Log Call</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => handleQuickLog('email', 'Sent an email to the author')}
                      disabled={isSubmitting}
                    >
                      <Mail className="h-5 w-5" />
                      <span className="text-xs">Log Email</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => handleQuickLog('meeting', 'Had a meeting with the author')}
                      disabled={isSubmitting}
                    >
                      <Calendar className="h-5 w-5" />
                      <span className="text-xs">Log Meeting</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => handleQuickLog('note', 'Added a note about this lead')}
                      disabled={isSubmitting}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">Add Note</span>
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4">
                  <div>
                    <Label htmlFor="activity-type">Activity Type</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="summary">Summary *</Label>
                    <Textarea
                      id="summary"
                      placeholder="Describe what happened..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="outcome">Outcome (Optional)</Label>
                    <Textarea
                      id="outcome"
                      placeholder="What was the result or next steps?"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCustomActivity}
                      disabled={!activityType || !summary.trim() || isSubmitting}
                    >
                      {isSubmitting ? 'Logging...' : 'Log Activity'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading activities...
          </div>
        ) : activities?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No activities logged yet. Start by logging your first interaction!
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-4 pr-4">
              {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Clock className="h-4 w-4" />
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="space-y-2 ml-6">
                    {dayActivities.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}; 
import React, { useState } from 'react';
import { User, UserCheck, UserX, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateLead } from '@/hooks/useLeads';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import type { Lead } from '@/lib/api/leads';

interface LeadAssignmentProps {
  lead: Lead;
  onAssignmentChange?: (assignedTo: string | null) => void;
}

export const LeadAssignment: React.FC<LeadAssignmentProps> = ({ 
  lead, 
  onAssignmentChange 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assignmentNote, setAssignmentNote] = useState('');
  
  const { user } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const updateLead = useUpdateLead();
  const createActivity = useCreateActivity();

  // Filter users to show all active users
  const assignableUsers = users?.filter(u => u.is_active) || [];

  const handleAssignment = async () => {
    if (!selectedUserId) return;

    try {
      const assignedUser = assignableUsers.find(u => u.id === selectedUserId);
      
      // Update the lead assignment
      await updateLead.mutateAsync({
        id: lead.id,
        data: { assigned_to: selectedUserId }
      });

      // Log the assignment activity
      await createActivity.mutateAsync({
        lead_id: lead.id,
        activity_type: 'assignment',
        summary: `Lead assigned to ${assignedUser?.full_name || 'Unknown User'}`,
        outcome: assignmentNote || null,
      });

      onAssignmentChange?.(selectedUserId);
      setIsDialogOpen(false);
      setSelectedUserId('');
      setAssignmentNote('');
    } catch (error) {
      console.error('Assignment failed:', error);
    }
  };

  const handleUnassign = async () => {
    try {
      // Update the lead to remove assignment
      await updateLead.mutateAsync({
        id: lead.id,
        data: { assigned_to: null }
      });

      // Log the unassignment activity
      await createActivity.mutateAsync({
        lead_id: lead.id,
        activity_type: 'assignment',
        summary: 'Lead unassigned',
        outcome: 'Lead removed from assigned user',
      });

      onAssignmentChange?.(null);
    } catch (error) {
      console.error('Unassignment failed:', error);
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

  const isLoading = updateLead.isPending || createActivity.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Assignment */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Currently Assigned To</Label>
          
          {lead.assigned_to_profile ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={lead.assigned_to_profile.avatar_url || ''} />
                  <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                    {getInitials(lead.assigned_to_profile.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-gray-900">
                    {lead.assigned_to_profile.full_name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {lead.assigned_to_profile.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Assigned
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassign}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Unassign
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserX className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-600">Unassigned</div>
                  <div className="text-sm text-gray-500">No user assigned to this lead</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                <UserX className="h-3 w-3 mr-1" />
                Unassigned
              </Badge>
            </div>
          )}
        </div>

        {/* Assignment Actions */}
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1">
                <User className="h-4 w-4 mr-2" />
                {lead.assigned_to_profile ? 'Reassign Lead' : 'Assign Lead'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {lead.assigned_to_profile ? 'Reassign Lead' : 'Assign Lead'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignee">Select User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user to assign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersLoading ? (
                        <SelectItem value="loading" disabled>Loading users...</SelectItem>
                      ) : assignableUsers.length === 0 ? (
                        <SelectItem value="no-users" disabled>No assignable users found</SelectItem>
                      ) : (
                        assignableUsers.map((assignableUser) => (
                          <SelectItem key={assignableUser.id} value={assignableUser.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignableUser.avatar_url || ''} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(assignableUser.full_name || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {assignableUser.full_name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {assignableUser.role.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="note">Assignment Note (Optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Add a note about this assignment..."
                    value={assignmentNote}
                    onChange={(e) => setAssignmentNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignment}
                    disabled={!selectedUserId || isLoading}
                  >
                    {isLoading ? 'Assigning...' : 'Assign Lead'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Assignment Stats */}
        {assignableUsers.length > 0 && (
          <div className="pt-3 border-t">
            <Label className="text-sm font-medium text-gray-600">Available Team Members</Label>
            <div className="mt-2 text-sm text-gray-500">
              {assignableUsers.length} team member{assignableUsers.length !== 1 ? 's' : ''} available for assignment
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
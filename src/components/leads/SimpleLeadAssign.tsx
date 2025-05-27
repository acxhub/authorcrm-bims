import React, { useState } from 'react';
import { UserPlus, User, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateLead } from '@/hooks/useLeads';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import type { Lead } from '@/lib/api/leads';

interface SimpleLeadAssignProps {
  lead: Lead;
  onAssignmentChange?: (assignedTo: string | null) => void;
}

export const SimpleLeadAssign: React.FC<SimpleLeadAssignProps> = ({ 
  lead, 
  onAssignmentChange 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const updateLead = useUpdateLead();
  const createActivity = useCreateActivity();

  // Filter users to show all active users, excluding currently assigned user
  const assignableUsers = users?.filter(u => 
    u.is_active &&
    u.id !== lead.assigned_to &&
    (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleAssignment = async (userId: string) => {
    try {
      const assignedUser = users?.find(u => u.id === userId);
      
      // Update the lead assignment
      await updateLead.mutateAsync({
        id: lead.id,
        data: { assigned_to: userId }
      });

      // Log the assignment activity
      await createActivity.mutateAsync({
        lead_id: lead.id,
        activity_type: 'assignment',
        summary: `Lead assigned to ${assignedUser?.full_name || 'Unknown User'}`,
        outcome: null,
      });

      onAssignmentChange?.(userId);
      setIsDialogOpen(false);
      setSearchTerm('');
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
    <div className="space-y-3">
      {/* Current Assignment */}
      {lead.assigned_to_profile ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={lead.assigned_to_profile.avatar_url || ''} />
              <AvatarFallback className="text-xs bg-green-100 text-green-700">
                {getInitials(lead.assigned_to_profile.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {lead.assigned_to_profile.full_name || 'Unknown User'}
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Assigned
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnassign}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <UserX className="h-3 w-3 mr-1" />
            Unassign
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
            <UserX className="h-3 w-3 text-gray-500" />
          </div>
          <span className="text-sm text-gray-500">Unassigned</span>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            No Assignment
          </Badge>
        </div>
      )}

      {/* Assign Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <UserPlus className="h-3 w-3 mr-1" />
            {lead.assigned_to_profile ? 'Reassign' : 'Assign Lead'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lead.assigned_to_profile ? 'Reassign Lead' : 'Assign Lead'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div>
              <Label htmlFor="user-search">Search Team Members</Label>
              <Input
                id="user-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Available Users */}
            <div>
              <Label>Available Team Members</Label>
              <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                {usersLoading ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Loading team members...
                  </div>
                ) : assignableUsers.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    {searchTerm ? 'No team members found matching your search' : 'No available team members for assignment'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignableUsers.map((assignableUser) => (
                      <div 
                        key={assignableUser.id} 
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                        onClick={() => handleAssignment(assignableUser.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignableUser.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {getInitials(assignableUser.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {assignableUser.full_name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {assignableUser.email} • {assignableUser.role.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={isLoading}
                        >
                          <User className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSearchTerm('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 
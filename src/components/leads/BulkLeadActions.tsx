import React, { useState } from 'react';
import { Users, UserPlus, Hash, Trash2, CheckSquare, RefreshCw, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateLead, useDeleteLead, useManageLeadTags } from '@/hooks/useLeads';
import { useTags } from '@/hooks/useTags';
import { useStatuses } from '@/hooks/useStatuses';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import type { Lead } from '@/lib/api/leads';

interface BulkLeadActionsProps {
  selectedLeads: Lead[];
  onSelectionChange: (leads: Lead[]) => void;
  onActionsComplete: () => void;
}

export const BulkLeadActions: React.FC<BulkLeadActionsProps> = ({
  selectedLeads,
  onSelectionChange,
  onActionsComplete,
}) => {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [openUserCombobox, setOpenUserCombobox] = useState(false);

  const { user } = useAuth();
  const { users, loading: usersLoading, total } = useUsers({}, 1, 100); // Fetch up to 100 users - should be enough for most cases
  const { data: allTags, isLoading: tagsLoading } = useTags();
  const { data: statuses, isLoading: statusesLoading } = useStatuses();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { addTags } = useManageLeadTags();
  const createActivity = useCreateActivity();

  // Show all active users (no pre-filtering)
  const assignableUsers = users?.filter(u => u.is_active) || [];

  const handleBulkAssign = async () => {
    if (!selectedUserId || selectedLeads.length === 0) return;

    try {
      const assignedUser = assignableUsers.find(u => u.id === selectedUserId);
      
      // Update all selected leads
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await updateLead.mutateAsync({
            id: lead.id,
            data: { assigned_to: selectedUserId }
          });

          // Log the assignment activity
          await createActivity.mutateAsync({
            lead_id: lead.id,
            user_id: user?.id || '',
            activity_type: 'assignment',
            summary: `Lead bulk assigned to ${assignedUser?.full_name || 'Unknown User'}`,
            outcome: `Part of bulk assignment of ${selectedLeads.length} leads`,
          });
        })
      );

      setIsAssignDialogOpen(false);
      setSelectedUserId('');
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk assignment failed:', error);
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedTagIds.length === 0 || selectedLeads.length === 0) return;

    try {
      // Add tags to all selected leads
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await addTags.mutateAsync({ leadId: lead.id, tagIds: selectedTagIds });
        })
      );

      setIsTagDialogOpen(false);
      setSelectedTagIds([]);
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk tag addition failed:', error);
    }
  };

  const handleBulkChangeStatus = async () => {
    if (!selectedStatusId || selectedLeads.length === 0) return;

    try {
      const selectedStatus = statuses?.find(s => s.id === selectedStatusId);
      
      // Update all selected leads
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await updateLead.mutateAsync({
            id: lead.id,
            data: { status_id: selectedStatusId }
          });

          // Log the status change activity
          await createActivity.mutateAsync({
            lead_id: lead.id,
            user_id: user?.id || '',
            activity_type: 'status_change',
            summary: `Lead status bulk changed to ${selectedStatus?.name || 'Unknown Status'}`,
            outcome: `Part of bulk status change of ${selectedLeads.length} leads`,
          });
        })
      );

      setIsStatusDialogOpen(false);
      setSelectedStatusId('');
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk status change failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete all selected leads
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await deleteLead.mutateAsync(lead.id);
        })
      );

      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk deletion failed:', error);
    }
  };

  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      setSelectedTagIds(prev => [...prev, tagId]);
    } else {
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
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

  const isLoading = updateLead.isPending || deleteLead.isPending || addTags.isPending;

  if (selectedLeads.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Bulk Actions ({selectedLeads.length} selected)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {/* Bulk Assign */}
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign to User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Assign Leads</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Assigning {selectedLeads.length} leads to:</Label>
                  
                  {/* Combobox with integrated search */}
                  <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUserCombobox}
                        className="w-full justify-between font-normal"
                      >
                        {selectedUserId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={assignableUsers.find(u => u.id === selectedUserId)?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(assignableUsers.find(u => u.id === selectedUserId)?.full_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <div className="font-medium">
                                {assignableUsers.find(u => u.id === selectedUserId)?.full_name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                {assignableUsers.find(u => u.id === selectedUserId)?.role.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Search and select a user...</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[460px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search users by name or email..." 
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>
                            {usersLoading ? "Loading users..." : "No users found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {assignableUsers.map((assignableUser) => (
                              <CommandItem
                                key={assignableUser.id}
                                value={`${assignableUser.full_name} ${assignableUser.email}`}
                                onSelect={() => {
                                  setSelectedUserId(assignableUser.id);
                                  setOpenUserCombobox(false);
                                }}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={assignableUser.avatar_url || ''} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(assignableUser.full_name || 'U')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                      {assignableUser.full_name || 'Unknown User'}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
                                      {assignableUser.email}
                                    </div>
                                    <div className="text-xs text-gray-400 capitalize">
                                      {assignableUser.role.replace('_', ' ')}
                                    </div>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4 flex-shrink-0",
                                      selectedUserId === assignableUser.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Show total users count for debugging */}
                  {!usersLoading && (
                    <p className="text-xs text-gray-500">
                      Showing {assignableUsers.length} active users out of {total} total users
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAssign}
                    disabled={!selectedUserId || isLoading}
                  >
                    {isLoading ? 'Assigning...' : 'Assign Leads'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Change Status */}
          <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Change Status
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Change Status</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Changing status for {selectedLeads.length} leads to:</Label>
                  <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statusesLoading ? (
                        <SelectItem value="loading" disabled>Loading statuses...</SelectItem>
                      ) : statuses?.length === 0 ? (
                        <SelectItem value="no-statuses" disabled>No statuses found</SelectItem>
                      ) : (
                        statuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsStatusDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkChangeStatus}
                    disabled={!selectedStatusId || isLoading}
                  >
                    {isLoading ? 'Changing...' : 'Change Status'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Add Tags */}
          <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Hash className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Add Tags</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Adding tags to {selectedLeads.length} leads:</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {tagsLoading ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Loading tags...
                      </div>
                    ) : allTags?.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        No tags available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allTags?.map((tag) => (
                          <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bulk-tag-${tag.id}`}
                              checked={selectedTagIds.includes(tag.id)}
                              onCheckedChange={(checked) => 
                                handleTagToggle(tag.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`bulk-tag-${tag.id}`}
                              className="flex-1 flex items-center gap-2 cursor-pointer"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{tag.name}</div>
                                {tag.description && (
                                  <div className="text-xs text-gray-500">
                                    {tag.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedTagIds.length > 0 && (
                  <div>
                    <Label>Selected Tags ({selectedTagIds.length})</Label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedTagIds.map((tagId) => {
                        const tag = allTags?.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <Badge
                            key={tagId}
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                              borderColor: tag.color
                            }}
                          >
                            {tag.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsTagDialogOpen(false);
                      setSelectedTagIds([]);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAddTags}
                    disabled={selectedTagIds.length === 0 || isLoading}
                  >
                    {isLoading ? 'Adding...' : 'Add Tags'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Delete */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 
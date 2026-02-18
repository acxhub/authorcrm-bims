import React, { useState } from 'react';
import { Users, UserPlus, Hash, Trash2, CheckSquare, RefreshCw, Search, Check, X } from 'lucide-react';
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
import { useUsersContext } from '@/contexts/UsersContext';
import { useUpdateLead, useArchiveLead, useManageLeadTags } from '@/hooks/useLeads';
import { leadsApi } from '@/lib/api/leads';
import { toast } from '@/hooks/use-toast';
import { useTags } from '@/hooks/useTags';
import { useStatuses } from '@/hooks/useStatuses';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth, useProfile } from '@/hooks/useAuth';
import type { Lead } from '@/lib/api/leads';
import { supabase } from '@/integrations/supabase/client';
import { notify, getManagers } from '@/lib/notifications/notify';

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
  const [isRemoveTagDialogOpen, setIsRemoveTagDialogOpen] = useState(false);
  const [selectedRemoveTagIds, setSelectedRemoveTagIds] = useState<string[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [openUserCombobox, setOpenUserCombobox] = useState(false);

  const { user } = useAuth();
  const { profile } = useProfile();
  const { activeUsers: assignableUsers, users: allUsers, loading: usersLoading } = useUsersContext();
  const { data: allTags, isLoading: tagsLoading } = useTags();
  const { data: statuses, isLoading: statusesLoading } = useStatuses();
  const updateLead = useUpdateLead();
  const archiveLead = useArchiveLead();
  const { addTags, removeTags } = useManageLeadTags();
  const createActivity = useCreateActivity();

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

      // Send a single bulk notification
      if (user?.id && selectedUserId) {
        notify.bulkLeadsAssigned({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          assigneeId: selectedUserId,
          count: selectedLeads.length,
        });
      }

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

      // Send a single bulk notification
      if (user?.id && selectedStatus) {
        notify.bulkLeadsStatusChanged({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          count: selectedLeads.length,
          newStatusName: selectedStatus.name,
          managers: getManagers(allUsers),
        });
      }

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
      `Are you sure you want to archive ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}?`
    );

    if (!confirmed) return;

    try {
      // Delete all selected leads
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await archiveLead.mutateAsync({ id: lead.id, deletedBy: user?.id || '' });
        })
      );

      // Send a single bulk notification
      if (user?.id) {
        notify.bulkLeadsDeleted({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          count: selectedLeads.length,
          managers: getManagers(allUsers),
        });
      }

      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk deletion failed:', error);
    }
  };

  const handleBulkRecycle = async () => {
    if (selectedLeads.length === 0) return;

    const confirmed = confirm(
      `Are you sure you want to recycle ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}? They will be unassigned, tags will be cleared, and status will be reset.`
    );

    if (!confirmed) return;

    try {
      // Get only assigned leads
      const assignedLeadIds = selectedLeads
        .filter(lead => lead.assigned_to)
        .map(lead => lead.id);

      if (assignedLeadIds.length === 0) {
        alert('No assigned leads selected to recycle.');
        return;
      }

      // Call the bulk_recycle_leads function
      const { error } = await supabase.rpc('bulk_recycle_leads', {
        lead_ids: assignedLeadIds
      });

      if (error) throw error;

      // Clear all tags from recycled leads
      await supabase.from('lead_tags').delete().in('lead_id', assignedLeadIds);

      // Reset status to the first/default status
      const defaultStatus = statuses?.sort((a, b) => a.order_index - b.order_index)[0];
      if (defaultStatus) {
        await supabase.from('leads').update({ status_id: defaultStatus.id }).in('id', assignedLeadIds);
      }

      // Send a single bulk notification
      if (user?.id) {
        const previousAssigneeIds = selectedLeads
          .filter(lead => lead.assigned_to)
          .map(lead => lead.assigned_to as string);

        notify.bulkLeadsRecycled({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          count: assignedLeadIds.length,
          previousAssigneeIds,
          managers: getManagers(allUsers),
        });
      }

      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk recycle failed:', error);
      alert('Failed to recycle leads. Please try again.');
    }
  };

  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      setSelectedTagIds(prev => [...prev, tagId]);
    } else {
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    }
  };

  const handleRemoveTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      setSelectedRemoveTagIds(prev => [...prev, tagId]);
    } else {
      setSelectedRemoveTagIds(prev => prev.filter(id => id !== tagId));
    }
  };

  const handleBulkRemoveTags = async () => {
    if (selectedRemoveTagIds.length === 0 || selectedLeads.length === 0) return;

    try {
      // Use raw API to avoid per-lead toast spam from the mutation hook
      await Promise.all(
        selectedLeads.map(async (lead) => {
          const leadTagIds = lead.tags?.map(t => t.id) || [];
          const tagsToRemove = selectedRemoveTagIds.filter(id => leadTagIds.includes(id));
          if (tagsToRemove.length > 0) {
            await leadsApi.removeTagsFromLead(lead.id, tagsToRemove);
          }
        })
      );

      toast({
        title: 'Tags removed',
        description: `Tags removed from ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}.`,
      });

      setIsRemoveTagDialogOpen(false);
      setSelectedRemoveTagIds([]);
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk tag removal failed:', error);
      toast({
        title: 'Error removing tags',
        description: 'Some tags could not be removed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const canBulkRemoveTags = profile?.role === 'leads_manager' || profile?.role === 'sales_manager';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = updateLead.isPending || archiveLead.isPending || addTags.isPending || removeTags.isPending;

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
                      Showing {assignableUsers.length} active users
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

          {/* Bulk Remove Tags - managers only */}
          {canBulkRemoveTags && (
            <Dialog open={isRemoveTagDialogOpen} onOpenChange={(open) => { setIsRemoveTagDialogOpen(open); if (!open) setSelectedRemoveTagIds([]); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                  <X className="h-4 w-4 mr-2" />
                  Remove Tags
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bulk Remove Tags</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Removing tags from {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''}:</Label>
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
                                id={`bulk-remove-tag-${tag.id}`}
                                checked={selectedRemoveTagIds.includes(tag.id)}
                                onCheckedChange={(checked) =>
                                  handleRemoveTagToggle(tag.id, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`bulk-remove-tag-${tag.id}`}
                                className="flex-1 flex items-center gap-2 cursor-pointer"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{tag.name}</div>
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRemoveTagIds.length > 0 && (
                    <div>
                      <Label>Tags to Remove ({selectedRemoveTagIds.length})</Label>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedRemoveTagIds.map((tagId) => {
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
                        setIsRemoveTagDialogOpen(false);
                        setSelectedRemoveTagIds([]);
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkRemoveTags}
                      disabled={selectedRemoveTagIds.length === 0 || isLoading}
                      variant="destructive"
                    >
                      {isLoading ? 'Removing...' : 'Remove Tags'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Bulk Recycle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkRecycle}
            disabled={isLoading}
            className="text-orange-600 hover:text-orange-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recycle Selected
          </Button>

          {/* Bulk Archive */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Archive Selected
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
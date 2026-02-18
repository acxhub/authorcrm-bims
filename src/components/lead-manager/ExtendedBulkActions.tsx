import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, UserMinus, Hash, Trash2, RefreshCw, 
  Search, Check, X, Tag 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useUsersContext } from '@/contexts/UsersContext';
import { useUpdateLead, useArchiveLead, useManageLeadTags } from '@/hooks/useLeads';
import { useTags } from '@/hooks/useTags';
import { useStatuses } from '@/hooks/useStatuses';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { notify, getManagers } from '@/lib/notifications/notify';
import { useToast } from '@/hooks/use-toast';

interface ExtendedBulkActionsProps {
  selectedLeads: any[];
  onSelectionChange: (leads: any[]) => void;
  onActionsComplete: () => void;
}

export const ExtendedBulkActions: React.FC<ExtendedBulkActionsProps> = ({
  selectedLeads,
  onSelectionChange,
  onActionsComplete,
}) => {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const [isRemoveTagDialogOpen, setIsRemoveTagDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
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
  const { toast } = useToast();

  // Get tags that exist on selected leads for removal
  const tagsOnSelectedLeads = useMemo(() => {
    const tagMap = new Map<string, { id: string; name: string; color: string; count: number }>();
    
    selectedLeads.forEach(lead => {
      lead.tags?.forEach((lt: any) => {
        if (lt.tag) {
          const existing = tagMap.get(lt.tag.id);
          if (existing) {
            existing.count++;
          } else {
            tagMap.set(lt.tag.id, {
              id: lt.tag.id,
              name: lt.tag.name,
              color: lt.tag.color,
              count: 1,
            });
          }
        }
      });
    });
    
    return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
  }, [selectedLeads]);

  const handleBulkAssign = async () => {
    if (!selectedUserId || selectedLeads.length === 0) return;

    try {
      const assignedUser = assignableUsers.find(u => u.id === selectedUserId);
      
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await updateLead.mutateAsync({
            id: lead.id,
            data: { assigned_to: selectedUserId }
          });

          await createActivity.mutateAsync({
            lead_id: lead.id,
            user_id: user?.id || '',
            activity_type: 'assignment',
            summary: `Lead bulk assigned to ${assignedUser?.full_name || 'Unknown User'}`,
            outcome: `Part of bulk assignment of ${selectedLeads.length} leads`,
          });
        })
      );

      if (user?.id && selectedUserId) {
        notify.bulkLeadsAssigned({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          assigneeId: selectedUserId,
          count: selectedLeads.length,
        });
      }

      toast({
        title: 'Leads Assigned',
        description: `${selectedLeads.length} leads assigned to ${assignedUser?.full_name}`,
      });

      setIsAssignDialogOpen(false);
      setSelectedUserId('');
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk assignment failed:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign leads. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkUnassign = async () => {
    if (selectedLeads.length === 0) return;

    try {
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await updateLead.mutateAsync({
            id: lead.id,
            data: { assigned_to: null }
          });

          await createActivity.mutateAsync({
            lead_id: lead.id,
            user_id: user?.id || '',
            activity_type: 'assignment',
            summary: `Lead unassigned by ${profile?.full_name || 'Unknown User'}`,
            outcome: `Part of bulk unassignment of ${selectedLeads.length} leads`,
          });
        })
      );

      toast({
        title: 'Leads Unassigned',
        description: `${selectedLeads.length} leads have been unassigned`,
      });

      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk unassign failed:', error);
      toast({
        title: 'Unassign Failed',
        description: 'Failed to unassign leads. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedTagIds.length === 0 || selectedLeads.length === 0) return;

    try {
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await addTags.mutateAsync({ leadId: lead.id, tagIds: selectedTagIds });
        })
      );

      toast({
        title: 'Tags Added',
        description: `Added ${selectedTagIds.length} tags to ${selectedLeads.length} leads`,
      });

      setIsAddTagDialogOpen(false);
      setSelectedTagIds([]);
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk tag addition failed:', error);
      toast({
        title: 'Add Tags Failed',
        description: 'Failed to add tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkRemoveTags = async () => {
    if (selectedRemoveTagIds.length === 0 || selectedLeads.length === 0) return;

    try {
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await removeTags.mutateAsync({ leadId: lead.id, tagIds: selectedRemoveTagIds });
        })
      );

      toast({
        title: 'Tags Removed',
        description: `Removed ${selectedRemoveTagIds.length} tags from ${selectedLeads.length} leads`,
      });

      setIsRemoveTagDialogOpen(false);
      setSelectedRemoveTagIds([]);
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk tag removal failed:', error);
      toast({
        title: 'Remove Tags Failed',
        description: 'Failed to remove tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClearAllTags = async () => {
    if (selectedLeads.length === 0) return;

    try {
      const leadIds = selectedLeads.map(l => l.id);
      await supabase.from('lead_tags').delete().in('lead_id', leadIds);

      toast({
        title: 'All Tags Cleared',
        description: `Cleared all tags from ${selectedLeads.length} leads`,
      });

      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Clear all tags failed:', error);
      toast({
        title: 'Clear Tags Failed',
        description: 'Failed to clear tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkChangeStatus = async () => {
    if (!selectedStatusId || selectedLeads.length === 0) return;

    try {
      const selectedStatus = statuses?.find(s => s.id === selectedStatusId);
      
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await updateLead.mutateAsync({
            id: lead.id,
            data: { status_id: selectedStatusId }
          });

          await createActivity.mutateAsync({
            lead_id: lead.id,
            user_id: user?.id || '',
            activity_type: 'status_change',
            summary: `Lead status bulk changed to ${selectedStatus?.name || 'Unknown Status'}`,
            outcome: `Part of bulk status change of ${selectedLeads.length} leads`,
          });
        })
      );

      if (user?.id && selectedStatus) {
        notify.bulkLeadsStatusChanged({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          count: selectedLeads.length,
          newStatusName: selectedStatus.name,
          managers: getManagers(allUsers),
        });
      }

      toast({
        title: 'Status Changed',
        description: `Changed status to "${selectedStatus?.name}" for ${selectedLeads.length} leads`,
      });

      setIsStatusDialogOpen(false);
      setSelectedStatusId('');
      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk status change failed:', error);
      toast({
        title: 'Status Change Failed',
        description: 'Failed to change status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkArchive = async () => {
    if (selectedLeads.length === 0) return;

    try {
      await Promise.all(
        selectedLeads.map(async (lead) => {
          await archiveLead.mutateAsync({ id: lead.id, deletedBy: user?.id || '' });
        })
      );

      if (user?.id) {
        notify.bulkLeadsDeleted({
          actorId: user.id,
          actorName: profile?.full_name || 'Someone',
          count: selectedLeads.length,
          managers: getManagers(allUsers),
        });
      }

      toast({
        title: 'Leads Archived',
        description: `${selectedLeads.length} leads have been archived`,
      });

      onSelectionChange([]);
      onActionsComplete();
    } catch (error) {
      console.error('Bulk archive failed:', error);
      toast({
        title: 'Archive Failed',
        description: 'Failed to archive leads. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTagToggle = (tagId: string, checked: boolean, isRemove: boolean = false) => {
    const setter = isRemove ? setSelectedRemoveTagIds : setSelectedTagIds;
    if (checked) {
      setter(prev => [...prev, tagId]);
    } else {
      setter(prev => prev.filter(id => id !== tagId));
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

  const isLoading = updateLead.isPending || archiveLead.isPending || addTags.isPending || removeTags.isPending;

  if (selectedLeads.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
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
                Assign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Assign {selectedLeads.length} Leads</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Select Agent:</Label>
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
                            <span>{assignableUsers.find(u => u.id === selectedUserId)?.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select agent...</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search agents..." />
                        <CommandList>
                          <CommandEmpty>No agents found.</CommandEmpty>
                          <CommandGroup>
                            {assignableUsers.map((agent) => (
                              <CommandItem
                                key={agent.id}
                                value={`${agent.full_name} ${agent.email}`}
                                onSelect={() => {
                                  setSelectedUserId(agent.id);
                                  setOpenUserCombobox(false);
                                }}
                              >
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarImage src={agent.avatar_url || ''} />
                                  <AvatarFallback>{getInitials(agent.full_name || 'U')}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="font-medium">{agent.full_name}</div>
                                  <div className="text-xs text-muted-foreground">{agent.role}</div>
                                </div>
                                <Check className={cn("h-4 w-4", selectedUserId === agent.id ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkAssign} disabled={!selectedUserId || isLoading}>
                    {isLoading ? 'Assigning...' : 'Assign'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Unassign */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserMinus className="h-4 w-4 mr-2" />
                Unassign
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unassign {selectedLeads.length} Leads?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the assigned agent from all selected leads. They will appear in the unassigned queue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkUnassign} disabled={isLoading}>
                  Unassign
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                <DialogTitle>Change Status for {selectedLeads.length} Leads</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Select Status:</Label>
                  <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses?.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkChangeStatus} disabled={!selectedStatusId || isLoading}>
                    {isLoading ? 'Changing...' : 'Change Status'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Add Tags */}
          <Dialog open={isAddTagDialogOpen} onOpenChange={setIsAddTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Hash className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Tags to {selectedLeads.length} Leads</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto border rounded-md p-2">
                  {allTags?.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`add-tag-${tag.id}`}
                        checked={selectedTagIds.includes(tag.id)}
                        onCheckedChange={(checked) => handleTagToggle(tag.id, checked as boolean)}
                      />
                      <label htmlFor={`add-tag-${tag.id}`} className="flex items-center gap-2 cursor-pointer">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsAddTagDialogOpen(false); setSelectedTagIds([]); }} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkAddTags} disabled={selectedTagIds.length === 0 || isLoading}>
                    {isLoading ? 'Adding...' : `Add ${selectedTagIds.length} Tags`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Remove Tags */}
          <Dialog open={isRemoveTagDialogOpen} onOpenChange={setIsRemoveTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={tagsOnSelectedLeads.length === 0}>
                <Tag className="h-4 w-4 mr-2" />
                Remove Tags
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Remove Tags from {selectedLeads.length} Leads</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {tagsOnSelectedLeads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No tags found on selected leads
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border rounded-md p-2">
                    {tagsOnSelectedLeads.map((tag) => (
                      <div key={tag.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`remove-tag-${tag.id}`}
                            checked={selectedRemoveTagIds.includes(tag.id)}
                            onCheckedChange={(checked) => handleTagToggle(tag.id, checked as boolean, true)}
                          />
                          <label htmlFor={`remove-tag-${tag.id}`} className="flex items-center gap-2 cursor-pointer">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </label>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {tag.count} leads
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsRemoveTagDialogOpen(false); setSelectedRemoveTagIds([]); }} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkRemoveTags} 
                    disabled={selectedRemoveTagIds.length === 0 || isLoading}
                    variant="destructive"
                  >
                    {isLoading ? 'Removing...' : `Remove ${selectedRemoveTagIds.length} Tags`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Clear All Tags */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                <X className="h-4 w-4 mr-2" />
                Clear All Tags
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Tags?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove ALL tags from {selectedLeads.length} selected leads. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllTags} className="bg-orange-600 hover:bg-orange-700">
                  Clear All Tags
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Archive */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive {selectedLeads.length} Leads?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive all selected leads. They can be restored from the archive later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkArchive} className="bg-red-600 hover:bg-red-700">
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Clear Selection */}
          <Button variant="ghost" size="sm" onClick={() => onSelectionChange([])}>
            Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

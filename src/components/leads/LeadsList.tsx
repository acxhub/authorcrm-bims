import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Mail, Phone, MoreHorizontal, Edit, Trash2, Eye, UserPlus, Calendar, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLeads, useDeleteLead, useUpdateLead } from '@/hooks/useLeads';
import { useStatuses } from '@/hooks/useStatuses';
import { BulkLeadActions } from './BulkLeadActions';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/lib/api/leads';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTags } from '@/hooks/useTags';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';
import { useTagsRealtime } from '@/hooks/useTagsRealtime';
import { useStatusesRealtime } from '@/hooks/useStatusesRealtime';
import { useUsersContext } from '@/contexts/UsersContext';
import { SearchableUserSelect } from '@/components/ui/searchable-user-select';
import { useLeadsState } from '@/hooks/useLeadsState';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsContainer } from '@/components/ui/notifications';
import { useCreateActivity } from '@/hooks/useActivities';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LeadsListProps {
  onCreateLead?: () => void;
  onEditLead?: (lead: Lead) => void;
  onViewLead?: (lead: Lead) => void;
}

export const LeadsList: React.FC<LeadsListProps> = ({
  onCreateLead,
  onEditLead,
  onViewLead,
}) => {
  const navigate = useNavigate();
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  
  // State management with persistence
  const leadsState = useLeadsState();
  const { state, updateFilters, updatePage, updatePageSize, updateScrollPosition, preserveScrollPosition, isLoaded } = leadsState;
  
  // Notifications
  const notifications = useNotifications();
  
  // Hooks
  const { user } = useAuth();
  const { profile } = useProfile();
  const updateLead = useUpdateLead();
  const createActivity = useCreateActivity();

  // Enable realtime updates
  useLeadsRealtime();
  useTagsRealtime();
  useStatusesRealtime();

  const { data: leadsData, isLoading, refetch } = useLeads(
    {
      search: state.filters.search || undefined,
      status_ids: state.filters.statusFilter ? [state.filters.statusFilter] : undefined,
      tag_ids: state.filters.tagFilter?.length ? state.filters.tagFilter : undefined,
      assigned_to: state.filters.assignedToFilter || undefined,
      assignment_status: state.filters.assignmentStatusFilter || undefined,
      date_from: state.filters.dateFromFilter || undefined,
      date_to: state.filters.dateToFilter || undefined,
    },
    state.page,
    state.pageSize
  );

  const { data: statuses } = useStatuses();
  const { activeUsers, loading: usersLoading } = useUsersContext(); // Use context instead of hook
  const deleteLead = useDeleteLead();
  const { data: tags } = useTags();

  // Save scroll position before actions
  const saveScrollPosition = () => {
    updateScrollPosition(window.scrollY);
  };

  // Handle filters
  const handleSearch = (value: string) => {
    updateFilters({ search: value });
  };

  const handleStatusFilter = (statusId: string) => {
    updateFilters({ statusFilter: statusId === 'all' ? '' : statusId });
  };

  const handleAssignedToFilter = (userId: string) => {
    updateFilters({ assignedToFilter: userId === 'all' ? '' : userId });
  };

  const handleAssignmentStatusFilter = (status: 'all' | 'assigned' | 'unassigned') => {
    updateFilters({ assignmentStatusFilter: status });
  };

  const handleDateFromFilter = (date: string) => {
    updateFilters({ dateFromFilter: date });
  };

  const handleDateToFilter = (date: string) => {
    updateFilters({ dateToFilter: date });
  };

  const handleTagFilter = (tagId: string, checked: boolean) => {
    const currentTags = state.filters.tagFilter || [];
    const newTags = checked 
      ? [...currentTags, tagId]
      : currentTags.filter(id => id !== tagId);
    updateFilters({ tagFilter: newTags });
  };

  const handleClearTagFilter = () => {
    updateFilters({ tagFilter: [] });
  };

  const handlePageSizeChange = (newPageSize: string) => {
    updatePageSize(parseInt(newPageSize));
  };

  const handleViewDetails = (lead: Lead) => {
    saveScrollPosition();
    navigate(`/leads/${lead.id}`);
  };

  const handleDeleteLead = (leadId: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      saveScrollPosition();
      deleteLead.mutate(leadId, {
        onSuccess: () => {
          notifications.addNotification({
            type: 'success',
            title: 'Lead deleted successfully',
          });
          preserveScrollPosition();
        },
        onError: () => {
          notifications.addNotification({
            type: 'error',
            title: 'Failed to delete lead',
          });
        }
      });
    }
  };

  const handleRecycleLead = async (leadId: string) => {
    if (confirm('Are you sure you want to recycle this lead? It will be unassigned and available for reassignment.')) {
      try {
        const { error } = await supabase.rpc('recycle_lead', { lead_id: leadId });
        
        if (error) throw error;
        
        notifications.addNotification({
          type: 'success',
          title: 'Lead recycled successfully',
        });
        
        // Refresh the leads list
        refetch();
        preserveScrollPosition();
      } catch (error) {
        notifications.addNotification({
          type: 'error',
          title: 'Failed to recycle lead',
        });
      }
    }
  };

  // Individual lead assignment
  const handleQuickAssign = async (leadId: string, assignedTo: string | null) => {
    setIsAssigning(leadId);
    try {
      const assignedUser = assignedTo ? activeUsers.find(u => u.id === assignedTo) : null;
      
      await updateLead.mutateAsync({
        id: leadId,
        data: { assigned_to: assignedTo }
      });

      if (assignedTo && assignedUser && user) {
        await createActivity.mutateAsync({
          lead_id: leadId,
          user_id: user.id,
          activity_type: 'assignment',
          summary: `Lead assigned to ${assignedUser.full_name}`,
          outcome: 'Lead assignment completed successfully',
        });
      }

      notifications.addNotification({
        type: 'success',
        title: assignedTo ? 'Lead assigned successfully' : 'Lead unassigned successfully',
        message: assignedTo ? `Assigned to ${assignedUser?.full_name}` : 'Lead is now unassigned',
      });

      preserveScrollPosition();
    } catch (error) {
      notifications.addNotification({
        type: 'error',
        title: 'Assignment failed',
        message: 'Please try again',
      });
    } finally {
      setIsAssigning(null);
    }
  };

  const handleSelectLead = (lead: Lead, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, lead]);
    } else {
      setSelectedLeads(prev => prev.filter(l => l.id !== lead.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && leadsData?.data) {
      setSelectedLeads(leadsData.data);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleBulkActionsComplete = () => {
    setSelectedLeads([]);
    refetch();
    preserveScrollPosition();
  };

  const getStatusColor = (status: any) => {
    return status?.color || '#6B7280';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLeadSelected = (leadId: string) => {
    return selectedLeads.some(lead => lead.id === leadId);
  };

  const isAllSelected = leadsData?.data && leadsData.data.length > 0 && 
    selectedLeads.length === leadsData.data.length;

  // Reset filters
  const resetFilters = () => {
    updateFilters({
      search: '',
      statusFilter: '',
      assignedToFilter: '',
      assignmentStatusFilter: 'all',
      dateFromFilter: '',
      dateToFilter: '',
      tagFilter: [],
    });
  };

  const hasActiveFilters = state.filters.search || 
    state.filters.statusFilter || 
    state.filters.assignedToFilter || 
    state.filters.assignmentStatusFilter !== 'all' ||
    state.filters.dateFromFilter ||
    state.filters.dateToFilter ||
    (state.filters.tagFilter && state.filters.tagFilter.length > 0);

  if (!isLoaded) {
    return <div className="text-center py-8"><div className="text-gray-500">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <NotificationsContainer 
        notifications={notifications.notifications}
        onClose={notifications.removeNotification}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-600">Manage your author and book leads</p>
        </div>
        {onCreateLead && (
          <Button onClick={onCreateLead}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        )}
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First row of filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by author name, book title, or email..."
                    value={state.filters.search || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48 min-w-[160px]">
                <Select value={state.filters.statusFilter || 'all'} onValueChange={handleStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
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
              <div className="w-48 min-w-[160px]">
                <Select value={state.filters.assignedToFilter || 'all'} onValueChange={handleAssignedToFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by assigned to" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {activeUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second row of filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="w-48 min-w-[160px]">
                <Select value={state.filters.assignmentStatusFilter || 'all'} onValueChange={handleAssignmentStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assignment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48 min-w-[160px]">
                <Input
                  type="date"
                  placeholder="From date"
                  value={state.filters.dateFromFilter || ''}
                  onChange={(e) => handleDateFromFilter(e.target.value)}
                />
              </div>
              <div className="w-48 min-w-[160px]">
                <Input
                  type="date"
                  placeholder="To date"
                  value={state.filters.dateToFilter || ''}
                  onChange={(e) => handleDateToFilter(e.target.value)}
                />
              </div>
              <div className="w-48 min-w-[160px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Filter className="h-4 w-4 mr-2" />
                      Tags ({state.filters.tagFilter?.length || 0})
                      {(state.filters.tagFilter && state.filters.tagFilter.length > 0) && (
                        <span className="ml-2 flex flex-wrap gap-1">
                          {tags?.filter(t => state.filters.tagFilter?.includes(t.id)).map(tag => (
                            <Badge key={tag.id} style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }} className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {tags?.length ? tags.map(tag => (
                        <label key={tag.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={state.filters.tagFilter?.includes(tag.id) || false}
                            onChange={e => handleTagFilter(tag.id, e.target.checked)}
                            className="accent-blue-600"
                          />
                          <span className="text-xs" style={{ color: tag.color }}>{tag.name}</span>
                        </label>
                      )) : <span className="text-xs text-gray-400">No tags</span>}
                    </div>
                    {(state.filters.tagFilter && state.filters.tagFilter.length > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={handleClearTagFilter}
                      >
                        Clear tag filter
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <BulkLeadActions
        selectedLeads={selectedLeads}
        onSelectionChange={setSelectedLeads}
        onActionsComplete={handleBulkActionsComplete}
      />

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading leads...</div>
            </div>
          ) : leadsData?.data.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">No leads found</div>
              {onCreateLead && (
                <Button onClick={onCreateLead} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first lead
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all leads"
                      />
                    </TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Book Title</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsData?.data.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleViewDetails(lead)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isLeadSelected(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead, checked as boolean)}
                          aria-label={`Select lead ${lead.author_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {getInitials(lead.author_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">
                              {lead.author_name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {lead.book_title && lead.book_title.length > 24 ? (
                            <span title={lead.book_title}>{lead.book_title.slice(0, 24) + '…'}</span>
                          ) : (
                            <span title={lead.book_title}>{lead.book_title}</span>
                          )}
                        </div>
                        {lead.multiple_titles && (
                          <Badge variant="secondary" className="mt-1">
                            Multiple Titles
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {lead.publisher || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className="font-medium"
                          style={{ 
                            backgroundColor: `${getStatusColor(lead.status)}20`,
                            color: getStatusColor(lead.status),
                            borderColor: getStatusColor(lead.status)
                          }}
                        >
                          {lead.status.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.tags?.length ? (
                          <div className="relative group">
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-help"
                              style={{
                                backgroundColor: `${lead.tags[lead.tags.length - 1].color}20`,
                                color: lead.tags[lead.tags.length - 1].color,
                                borderColor: lead.tags[lead.tags.length - 1].color
                              }}
                            >
                              {lead.tags[lead.tags.length - 1].name}
                              {lead.tags.length > 1 && (
                                <span className="ml-1 text-xs opacity-70">+{lead.tags.length - 1}</span>
                              )}
                            </Badge>
                            {lead.tags.length > 1 && (
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] max-w-[300px]">
                                  <div className="text-xs font-medium text-gray-700 mb-1">All Tags:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {lead.tags.map((tag: any) => (
                                      <Badge
                                        key={tag.id}
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
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No tags</span>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {lead.assigned_to_profile ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={lead.assigned_to_profile.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(lead.assigned_to_profile.full_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {lead.assigned_to_profile.full_name || 'Unknown'}
                            </span>
                            <SearchableUserSelect
                              users={activeUsers}
                              value={lead.assigned_to}
                              onValueChange={(value) => handleQuickAssign(lead.id, value)}
                              disabled={isAssigning === lead.id || usersLoading}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Unassigned</span>
                            <SearchableUserSelect
                              users={activeUsers}
                              value={null}
                              onValueChange={(value) => handleQuickAssign(lead.id, value)}
                              disabled={isAssigning === lead.id || usersLoading}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {lead.phone_number_1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Call"
                              onClick={() => { window.location.href = `tel:${lead.phone_number_1}`; }}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                          {lead.primary_email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Email"
                              onClick={() => { window.location.href = `mailto:${lead.primary_email}`; }}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(lead)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {onEditLead && (
                                <DropdownMenuItem onClick={() => {
                                  saveScrollPosition();
                                  onEditLead(lead);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {lead.assigned_to && (
                                <DropdownMenuItem 
                                  onClick={() => handleRecycleLead(lead.id)}
                                  className="text-orange-600"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Recycle
                                </DropdownMenuItem>
                              )}
                              {(profile?.role === 'leads_manager' || profile?.can_delete_leads) && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {leadsData && leadsData.total_pages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={state.pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">
                of {leadsData.count} leads
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePage(state.page - 1)}
                disabled={state.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {state.page} of {leadsData.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePage(state.page + 1)}
                disabled={state.page >= leadsData.total_pages}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 
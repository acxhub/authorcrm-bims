import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Mail, Phone, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLeads, useDeleteLead } from '@/hooks/useLeads';
import { useStatuses } from '@/hooks/useStatuses';
import { BulkLeadActions } from './BulkLeadActions';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/lib/api/leads';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTags } from '@/hooks/useTags';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';
import { useTagsRealtime } from '@/hooks/useTagsRealtime';
import { useStatusesRealtime } from '@/hooks/useStatusesRealtime';

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Enable realtime updates
  useLeadsRealtime();
  useTagsRealtime();
  useStatusesRealtime();

  const { data: leadsData, isLoading, refetch } = useLeads(
    {
      search: search || undefined,
      status_ids: statusFilter ? [statusFilter] : undefined,
      tag_ids: tagFilter.length ? tagFilter : undefined,
    },
    page,
    pageSize
  );

  const { data: statuses } = useStatuses();
  const deleteLead = useDeleteLead();
  const { data: tags } = useTags();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (statusId: string) => {
    setStatusFilter(statusId === 'all' ? '' : statusId);
    setPage(1);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setPage(1);
  };

  const handleViewDetails = (lead: Lead) => {
    navigate(`/leads/${lead.id}`);
  };

  const handleDeleteLead = (leadId: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLead.mutate(leadId);
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

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by author name, book title, or email..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48 min-w-[160px]">
              <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
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
            {/* Tag Filter */}
            <div className="min-w-[180px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between items-center">
                    <span>Filter by tags</span>
                    {tagFilter.length > 0 && (
                      <span className="ml-2 flex flex-wrap gap-1">
                        {tags?.filter(t => tagFilter.includes(t.id)).map(tag => (
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
                          checked={tagFilter.includes(tag.id)}
                          onChange={e => {
                            setTagFilter(prev =>
                              e.target.checked
                                ? [...prev, tag.id]
                                : prev.filter(id => id !== tag.id)
                            );
                            setPage(1);
                          }}
                          className="accent-blue-600"
                        />
                        <span className="text-xs" style={{ color: tag.color }}>{tag.name}</span>
                      </label>
                    )) : <span className="text-xs text-gray-400">No tags</span>}
                  </div>
                  {tagFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setTagFilter([])}
                    >
                      Clear tag filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Assigned To</TableHead>
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
                        <div className="flex flex-wrap gap-1">
                          {lead.tags?.length ? lead.tags.map((tag: any) => (
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
                          )) : <span className="text-xs text-gray-400">No tags</span>}
                        </div>
                      </TableCell>
                      <TableCell>
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
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Unassigned</span>
                        )}
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
                              onClick={() => window.open(`mailto:${lead.primary_email}`)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View"
                            onClick={() => handleViewDetails(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {leadsData && (leadsData.total_pages > 1 || leadsData.count > pageSize) && (
            <div className="flex items-center justify-between mt-4 p-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, leadsData.count)} of {leadsData.count} leads
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-500">per page</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm text-gray-600">
                  Page {page} of {leadsData.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= leadsData.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 
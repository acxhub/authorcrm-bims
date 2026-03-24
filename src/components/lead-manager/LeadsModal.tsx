import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNeverTouchedLeads,
  useWentColdLeads,
  useOrphanedLeads,
  useUnassignedLeadsManager,
  useLeadsByAgent,
  useLeadsByTag,
  useLeadsWithoutTags,
} from '@/hooks/useLeadManagerMetrics';
import { ExtendedBulkActions } from './ExtendedBulkActions';
import { getLeadDisplayName, getLeadBookTitleDisplay } from '@/lib/lead-display';

export type FilterType = 
  | 'unassigned' 
  | 'never-touched' 
  | 'went-cold' 
  | 'no-tags' 
  | 'orphaned' 
  | 'by-agent' 
  | 'by-tag';

interface LeadsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  filterType: FilterType;
  agentId?: string;
  tagId?: string;
  staleDays?: number;
}

export const LeadsModal: React.FC<LeadsModalProps> = ({
  open,
  onClose,
  title,
  description,
  filterType,
  agentId,
  tagId,
  staleDays = 60,
}) => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const limit = 50;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchTerm('');
      setSelectedLeads([]);
    }
  }, [open]);

  // Fetch data based on filter type
  const neverTouchedQuery = useNeverTouchedLeads(page, limit);
  const wentColdQuery = useWentColdLeads(staleDays, page, limit);
  const orphanedQuery = useOrphanedLeads(page, limit);
  const unassignedQuery = useUnassignedLeadsManager(page, limit);
  const byAgentQuery = useLeadsByAgent(agentId || '', page, limit);
  const byTagQuery = useLeadsByTag(tagId || '', page, limit);
  const noTagsQuery = useLeadsWithoutTags(page, limit);

  // Select the appropriate query based on filter type
  const getQueryData = () => {
    switch (filterType) {
      case 'never-touched':
        return neverTouchedQuery;
      case 'went-cold':
        return wentColdQuery;
      case 'orphaned':
        return orphanedQuery;
      case 'unassigned':
        return unassignedQuery;
      case 'by-agent':
        return byAgentQuery;
      case 'by-tag':
        return byTagQuery;
      case 'no-tags':
        return noTagsQuery;
      default:
        return unassignedQuery;
    }
  };

  const { data, isLoading, refetch } = getQueryData();

  const leads = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  // Filter leads by search term (client-side)
  const filteredLeads = leads.filter((lead: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.book_title?.toLowerCase().includes(search) ||
      lead.first_name?.toLowerCase().includes(search) ||
      lead.last_name?.toLowerCase().includes(search) ||
      lead.author_name?.toLowerCase().includes(search) ||
      lead.pen_name?.toLowerCase().includes(search) ||
      lead.primary_email?.toLowerCase().includes(search) ||
      lead.phone_number_1?.includes(search)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (lead: any, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, lead]);
    } else {
      setSelectedLeads(selectedLeads.filter((l) => l.id !== lead.id));
    }
  };

  const isSelected = (leadId: string) => selectedLeads.some((l) => l.id === leadId);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['lead-manager-metrics'] });
  };

  const handleActionsComplete = () => {
    setSelectedLeads([]);
    handleRefresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex items-center gap-4 py-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {selectedLeads.length > 0 && (
          <div className="flex-shrink-0">
            <ExtendedBulkActions
              selectedLeads={selectedLeads}
              onSelectionChange={setSelectedLeads}
              onActionsComplete={handleActionsComplete}
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No leads found
              </div>
            ) : (
              <div className="space-y-2 p-2">
                <div className="flex items-center gap-4 p-2 border-b">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedLeads.length > 0
                      ? `${selectedLeads.length} selected`
                      : `Select all (${filteredLeads.length})`}
                  </span>
                </div>

                {filteredLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                      isSelected(lead.id) ? 'bg-muted/50 border-primary' : ''
                    }`}
                  >
                    <Checkbox
                      checked={isSelected(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead, checked as boolean)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium truncate ${!lead.book_title?.trim() ? 'text-muted-foreground' : ''}`}
                        >
                          {getLeadBookTitleDisplay(lead.book_title)}
                        </span>
                        {lead.status && (
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${lead.status.color}20`,
                              color: lead.status.color,
                              borderColor: lead.status.color,
                            }}
                          >
                            {lead.status.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getLeadDisplayName(lead)}
                        {lead.primary_email && ` • ${lead.primary_email}`}
                      </div>
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.tags.slice(0, 3).map((lt: any) => (
                            <Badge
                              key={lt.tag?.id}
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: `${lt.tag?.color}20`,
                                color: lt.tag?.color,
                              }}
                            >
                              {lt.tag?.name}
                            </Badge>
                          ))}
                          {lead.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{lead.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {lead.assigned_to_profile ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={lead.assigned_to_profile.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(lead.assigned_to_profile.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <div className="font-medium">{lead.assigned_to_profile.full_name}</div>
                          {!lead.assigned_to_profile.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Showing {filteredLeads.length} of {total} leads
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

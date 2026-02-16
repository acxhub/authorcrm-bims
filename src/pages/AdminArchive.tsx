import React, { useState } from 'react';
import { Archive, RotateCcw, Trash2, Users, FileText, MessageSquare, Activity, GitBranch, Hash, DollarSign, Shield, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useArchivedLeads, useRestoreLead, usePermanentlyDeleteLead } from '@/hooks/useLeads';
import { useArchivedDeals, useRestoreDeal, usePermanentlyDeleteDeal } from '@/hooks/useDeals';
import { useArchivedActivities, useRestoreActivity, usePermanentlyDeleteActivity } from '@/hooks/useActivities';
import { useArchivedComments, useRestoreComment, usePermanentlyDeleteComment } from '@/hooks/useComments';
import { useArchivedStatuses, useRestoreStatus, usePermanentlyDeleteStatus } from '@/hooks/useStatuses';
import { useArchivedTags, useRestoreTag, usePermanentlyDeleteTag } from '@/hooks/useTags';
import { useArchivedCommissionTiers, useRestoreCommissionTier, usePermanentlyDeleteCommissionTier } from '@/hooks/useCommissionTemplates';
import { canPermanentlyDelete, daysUntilPermanentDelete } from '@/lib/permissions';

const TABS = ['leads', 'deals', 'activities', 'comments', 'statuses', 'tags', 'commissions'];

export const AdminArchive: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get('tab');
  const activeTab = TABS.includes(urlTab || '') ? urlTab! : 'leads';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  if (!loading && (!user || !profile || profile.role !== 'leads_manager')) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">Loading archive...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Archive className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Archive</h1>
                    <p className="text-sm text-gray-600">View and manage archived items</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Leads Manager Access
                </Badge>
              </div>
            </div>
          </header>

          <main className="p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-7 bg-white/60 backdrop-blur-sm border border-gray-200/60">
                <TabsTrigger value="leads" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Leads</span>
                </TabsTrigger>
                <TabsTrigger value="deals" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Deals</span>
                </TabsTrigger>
                <TabsTrigger value="activities" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Activities</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Comments</span>
                </TabsTrigger>
                <TabsTrigger value="statuses" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">Statuses</span>
                </TabsTrigger>
                <TabsTrigger value="tags" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <Hash className="h-4 w-4" />
                  <span className="hidden sm:inline">Tags</span>
                </TabsTrigger>
                <TabsTrigger value="commissions" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Commissions</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leads">
                <ArchivedLeadsTab profile={profile} />
              </TabsContent>
              <TabsContent value="deals">
                <ArchivedDealsTab profile={profile} />
              </TabsContent>
              <TabsContent value="activities">
                <ArchivedActivitiesTab profile={profile} />
              </TabsContent>
              <TabsContent value="comments">
                <ArchivedCommentsTab profile={profile} />
              </TabsContent>
              <TabsContent value="statuses">
                <ArchivedStatusesTab profile={profile} />
              </TabsContent>
              <TabsContent value="tags">
                <ArchivedTagsTab profile={profile} />
              </TabsContent>
              <TabsContent value="commissions">
                <ArchivedCommissionTiersTab profile={profile} />
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

// Helper component for archive status badge
const ArchiveStatusBadge: React.FC<{ deletedAt: string | null }> = ({ deletedAt }) => {
  if (!deletedAt) return null;
  const days = daysUntilPermanentDelete(deletedAt);
  if (days === null) return null;

  if (days === 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Eligible for deletion
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs">
      <Clock className="h-3 w-3 mr-1" />
      {days}d until deletable
    </Badge>
  );
};

// Helper for action buttons
const ArchiveActions: React.FC<{
  id: string;
  deletedAt: string | null;
  profile: any;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}> = ({ id, deletedAt, profile, onRestore, onPermanentDelete, isRestoring, isDeleting }) => {
  const canDelete = canPermanentlyDelete(profile, deletedAt);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRestore(id)}
        disabled={isRestoring}
        className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        {isRestoring ? 'Restoring...' : 'Restore'}
      </Button>
      {canDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('Permanently delete this item? This cannot be undone.')) {
              onPermanentDelete(id);
            }
          }}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      )}
    </div>
  );
};

const EmptyArchive: React.FC<{ entity: string }> = ({ entity }) => (
  <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
    <CardContent className="py-12">
      <div className="text-center text-gray-500">
        <Archive className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No archived {entity}</p>
        <p className="text-sm">Archived items will appear here</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Leads Tab ───
const ArchivedLeadsTab: React.FC<{ profile: any }> = ({ profile }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useArchivedLeads(page, 20);
  const restoreLead = useRestoreLead();
  const permanentlyDeleteLead = usePermanentlyDeleteLead();

  const leads = data?.data || [];

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived leads...</div>;
  if (leads.length === 0) return <EmptyArchive entity="leads" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          Archived Leads ({data?.count || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Book Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  {lead.author_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'}
                </TableCell>
                <TableCell>{lead.book_title || '-'}</TableCell>
                <TableCell>{lead.primary_email || '-'}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {lead.deleted_at ? formatDistanceToNow(new Date(lead.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={lead.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={lead.id}
                    deletedAt={lead.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreLead.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteLead.mutate(id)}
                    isRestoring={restoreLead.isPending}
                    isDeleting={permanentlyDeleteLead.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data?.count && data.count > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-gray-500 self-center">Page {page} of {Math.ceil(data.count / 20)}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.count / 20)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Deals Tab ───
const ArchivedDealsTab: React.FC<{ profile: any }> = ({ profile }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useArchivedDeals(page, 20);
  const restoreDeal = useRestoreDeal();
  const permanentlyDeleteDeal = usePermanentlyDeleteDeal();

  const deals = data?.data || [];

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived deals...</div>;
  if (deals.length === 0) return <EmptyArchive entity="deals" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-600" />
          Archived Deals ({data?.count || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal: any) => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">{deal.offer_title || '-'}</TableCell>
                <TableCell>{deal.category || '-'}</TableCell>
                <TableCell>{deal.deal_value ? `$${deal.deal_value.toLocaleString()}` : '-'}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {deal.deleted_at ? formatDistanceToNow(new Date(deal.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={deal.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={deal.id}
                    deletedAt={deal.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreDeal.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteDeal.mutate(id)}
                    isRestoring={restoreDeal.isPending}
                    isDeleting={permanentlyDeleteDeal.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data?.count && data.count > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-gray-500 self-center">Page {page} of {Math.ceil(data.count / 20)}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.count / 20)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Activities Tab ───
const ArchivedActivitiesTab: React.FC<{ profile: any }> = ({ profile }) => {
  const { data: activities, isLoading } = useArchivedActivities(50);
  const restoreActivity = useRestoreActivity();
  const permanentlyDeleteActivity = usePermanentlyDeleteActivity();

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived activities...</div>;
  if (!activities || activities.length === 0) return <EmptyArchive entity="activities" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-600" />
          Archived Activities ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity: any) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <Badge variant="outline">{activity.activity_type}</Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[300px] truncate">{activity.summary || '-'}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {activity.activity_date ? formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {activity.deleted_at ? formatDistanceToNow(new Date(activity.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={activity.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={activity.id}
                    deletedAt={activity.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreActivity.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteActivity.mutate(id)}
                    isRestoring={restoreActivity.isPending}
                    isDeleting={permanentlyDeleteActivity.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── Comments Tab ───
const ArchivedCommentsTab: React.FC<{ profile: any }> = ({ profile }) => {
  const { data: comments, isLoading } = useArchivedComments(50);
  const restoreComment = useRestoreComment();
  const permanentlyDeleteComment = usePermanentlyDeleteComment();

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived comments...</div>;
  if (!comments || comments.length === 0) return <EmptyArchive entity="comments" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-amber-600" />
          Archived Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment: any) => (
              <TableRow key={comment.id}>
                <TableCell className="font-medium max-w-[400px] truncate">{comment.content}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {comment.deleted_at ? formatDistanceToNow(new Date(comment.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={comment.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={comment.id}
                    deletedAt={comment.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreComment.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteComment.mutate(id)}
                    isRestoring={restoreComment.isPending}
                    isDeleting={permanentlyDeleteComment.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── Statuses Tab ───
const ArchivedStatusesTab: React.FC<{ profile: any }> = ({ profile }) => {
  const { data: statuses, isLoading } = useArchivedStatuses();
  const restoreStatus = useRestoreStatus();
  const permanentlyDeleteStatus = usePermanentlyDeleteStatus();

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived statuses...</div>;
  if (!statuses || statuses.length === 0) return <EmptyArchive entity="statuses" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-amber-600" />
          Archived Statuses ({statuses.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status: any) => (
              <TableRow key={status.id}>
                <TableCell className="font-medium">{status.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm text-gray-500">{status.color}</span>
                  </div>
                </TableCell>
                <TableCell>{status.order_index}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {status.deleted_at ? formatDistanceToNow(new Date(status.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={status.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={status.id}
                    deletedAt={status.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreStatus.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteStatus.mutate(id)}
                    isRestoring={restoreStatus.isPending}
                    isDeleting={permanentlyDeleteStatus.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── Tags Tab ───
const ArchivedTagsTab: React.FC<{ profile: any }> = ({ profile }) => {
  const { data: tags, isLoading } = useArchivedTags();
  const restoreTag = useRestoreTag();
  const permanentlyDeleteTag = usePermanentlyDeleteTag();

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived tags...</div>;
  if (!tags || tags.length === 0) return <EmptyArchive entity="tags" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-amber-600" />
          Archived Tags ({tags.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag: any) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm text-gray-500">{tag.color}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{tag.description || '-'}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {tag.deleted_at ? formatDistanceToNow(new Date(tag.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={tag.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={tag.id}
                    deletedAt={tag.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreTag.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteTag.mutate(id)}
                    isRestoring={restoreTag.isPending}
                    isDeleting={permanentlyDeleteTag.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── Commission Tiers Tab ───
const ArchivedCommissionTiersTab: React.FC<{ profile: any }> = ({ profile }) => {
  const { data: tiers, isLoading } = useArchivedCommissionTiers();
  const restoreTier = useRestoreCommissionTier();
  const permanentlyDeleteTier = usePermanentlyDeleteCommissionTier();

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading archived commission tiers...</div>;
  if (!tiers || tiers.length === 0) return <EmptyArchive entity="commission tiers" />;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-600" />
          Archived Commission Tiers ({tiers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Min Deals</TableHead>
              <TableHead>Max Deals</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier: any) => (
              <TableRow key={tier.id}>
                <TableCell>{tier.min_deals}</TableCell>
                <TableCell>{tier.max_deals ?? 'Unlimited'}</TableCell>
                <TableCell>{tier.commission_rate}%</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {tier.deleted_at ? formatDistanceToNow(new Date(tier.deleted_at), { addSuffix: true }) : '-'}
                </TableCell>
                <TableCell>
                  <ArchiveStatusBadge deletedAt={tier.deleted_at} />
                </TableCell>
                <TableCell className="text-right">
                  <ArchiveActions
                    id={tier.id}
                    deletedAt={tier.deleted_at}
                    profile={profile}
                    onRestore={(id) => restoreTier.mutate(id)}
                    onPermanentDelete={(id) => permanentlyDeleteTier.mutate(id)}
                    isRestoring={restoreTier.isPending}
                    isDeleting={permanentlyDeleteTier.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

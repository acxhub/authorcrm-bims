import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink, Phone, Mail, Calendar, MapPin, User, Hash, MessageCircle, Activity, MoreHorizontal, Globe, Building2, TrendingUp, DollarSign, Tag, Briefcase, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useAuth } from '@/hooks/useAuth';
import { EditPipelineDealModal } from '@/components/pipeline/EditPipelineDealModal';
import { DealComments } from '@/components/deals/DealComments';
import { ReassignDealModal } from '@/components/deals/ReassignDealModal';
import { LogCallModal } from '@/components/deals/LogCallModal';
import { formatDistanceToNow } from 'date-fns';
import type { Deal, UpdateDealData } from '@/lib/api/deals';
import { useDealsRealtime } from '@/hooks/useDealsRealtime';
import { useCommentsRealtime } from '@/hooks/useCommentsRealtime';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import { DealCommissionInfo } from '@/components/deals/DealCommissionInfo';

const getCategoryIcon = (category: string | null) => {
  switch (category) {
    case 'Publishing':
      return Building2;
    case 'Marketing':
      return Megaphone;
    case 'Event':
      return Briefcase;
    default:
      return Tag;
  }
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'Publishing':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Marketing':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'Event':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const formatCurrency = (value: number | null) => {
  if (!value) return 'No value set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const DealDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [logCallModalOpen, setLogCallModalOpen] = useState(false);

  const { user } = useAuth();
  const { data: deal, isLoading, error } = useDeal(id!);
  const updateDealMutation = useUpdateDeal();

  // Enable realtime updates
  useDealsRealtime();
  useCommentsRealtime();
  useActivitiesRealtime();

  const handleBack = () => {
    navigate('/pipeline');
  };

  const handleEditDeal = () => {
    setEditingDeal(deal);
  };

  const handleEditSave = async (data: UpdateDealData) => {
    if (!editingDeal) return;
    
    try {
      await updateDealMutation.mutateAsync({
        id: editingDeal.id,
        data
      });
      setEditingDeal(null);
    } catch (error) {
      console.error('Failed to update deal:', error);
    }
  };

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handlePhoneClick = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleViewLead = () => {
    navigate(`/leads/${deal?.lead_id}`);
  };

  const handleReassignDeal = () => {
    setReassignModalOpen(true);
  };

  const handleLogCall = () => {
    setLogCallModalOpen(true);
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900">Loading deal details...</div>
                <div className="text-sm text-gray-500 mt-1">Please wait while we fetch the information</div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (error || !deal) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="text-lg font-medium text-red-600">Error loading deal</div>
                <div className="text-sm text-gray-500 mt-1">
                  {error?.message || 'Deal not found'}
                </div>
                <Button variant="outline" onClick={handleBack} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Pipeline
                </Button>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const CategoryIcon = getCategoryIcon(deal.category);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8" />
                <Button variant="outline" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Pipeline
                </Button>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                      {deal.offer_title}
                    </h1>
                    <p className="text-sm text-gray-600">Deal Details</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleViewLead}>
                  <User className="h-4 w-4 mr-2" />
                  View Lead
                </Button>
                <Button variant="outline" onClick={handleEditDeal}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Deal
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {deal.lead?.primary_email && (
                      <DropdownMenuItem onClick={() => handleEmailClick(deal.lead.primary_email!)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                    )}
                    {deal.lead?.phone_number_1 && (
                      <DropdownMenuItem onClick={() => handlePhoneClick(deal.lead.phone_number_1!)}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Primary
                      </DropdownMenuItem>
                    )}
                    {deal.lead?.amazon_link && (
                      <DropdownMenuItem onClick={() => window.open(deal.lead.amazon_link!, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Amazon
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Activities and Comments */}
              <div className="lg:col-span-2 space-y-6">
                {/* Deal Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Deal Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(deal.deal_value)}
                        </p>
                        <p className="text-sm text-gray-600">Deal Value</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: deal.status.color }}
                          />
                          <p className="text-sm font-medium">{deal.status.name}</p>
                        </div>
                        <p className="text-sm text-gray-600">Status</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {deal.assigned_to_profile?.full_name || 'Unassigned'}
                        </p>
                        <p className="text-sm text-gray-600">Assigned To</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {formatDistanceToNow(new Date(deal.created_at!), { addSuffix: true })}
                        </p>
                        <p className="text-sm text-gray-600">Created</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Deal Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                      Deal Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Offer Title</label>
                          <p className="text-sm text-gray-900">{deal.offer_title}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Category</label>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getCategoryColor(deal.category || '')}>
                              <CategoryIcon className="h-3 w-3 mr-1" />
                              {deal.category}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Created By</label>
                          <p className="text-sm text-gray-900">
                            {deal.created_by_profile?.full_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Book Title</label>
                          <p className="text-sm text-gray-900">
                            {deal.lead?.book_title && deal.lead.book_title.length > 24 ? (
                              <span title={deal.lead.book_title}>{deal.lead.book_title.slice(0, 24) + '…'}</span>
                            ) : (
                              <span title={deal.lead?.book_title}>{deal.lead?.book_title}</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Author</label>
                          <p className="text-sm text-gray-900">{deal.lead?.author_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Lead Status</label>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: deal.status.color }}
                            />
                            <span className="text-sm">{deal.status.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {deal.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                          {deal.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activities Tab */}
                <Tabs defaultValue="comments" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Comments
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="comments" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Comments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DealComments leadId={deal.lead_id} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" variant="outline" onClick={handleEditDeal}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Deal
                    </Button>
                    <Button className="w-full" variant="outline" onClick={handleReassignDeal}>
                      <User className="h-4 w-4 mr-2" />
                      Reassign Deal
                    </Button>
                    <Button className="w-full" variant="outline" onClick={handleViewLead}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Lead Details
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-full" variant="outline">
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          More Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEmailClick(deal.lead?.primary_email || '')}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogCall}>
                          <Phone className="h-4 w-4 mr-2" />
                          Log Call
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {deal.lead?.primary_email && (
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleEmailClick(deal.lead.primary_email)}>
                        <Mail className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Primary Email</p>
                          <p className="text-sm text-blue-600 underline group-hover:text-blue-800">{deal.lead.primary_email}</p>
                        </div>
                      </div>
                    )}
                    
                    {deal.lead?.phone_number_1 && (
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handlePhoneClick(deal.lead.phone_number_1)}>
                        <Phone className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-green-600 underline group-hover:text-green-800">{deal.lead.phone_number_1}</p>
                        </div>
                      </div>
                    )}
                    
                    {deal.lead?.website && (
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.open(deal.lead.website, '_blank')}>
                        <Globe className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium">Website</p>
                          <p className="text-sm text-indigo-600 underline group-hover:text-indigo-800">{deal.lead.website}</p>
                        </div>
                      </div>
                    )}
                    
                    {(deal.lead?.state || deal.lead?.country) && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Location</p>
                          <p className="text-sm text-gray-600">
                            {[deal.lead?.state, deal.lead?.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deal Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium">Deal Created</p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(deal.created_at!), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {deal.updated_at !== deal.created_at && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Last Updated</p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(deal.updated_at!), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Commission Info */}
                <DealCommissionInfo dealId={deal.id} />
              </div>
            </div>
          </main>

          {/* Edit Deal Modal */}
          <EditPipelineDealModal
            open={!!editingDeal}
            onClose={() => setEditingDeal(null)}
            deal={editingDeal}
            onSave={handleEditSave}
            isLoading={updateDealMutation.isPending}
          />

          {/* Reassign Deal Modal */}
          <ReassignDealModal
            open={reassignModalOpen}
            onClose={() => setReassignModalOpen(false)}
            deal={deal}
          />

          {/* Log Call Modal */}
          <LogCallModal
            open={logCallModalOpen}
            onClose={() => setLogCallModalOpen(false)}
            deal={deal}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}; 
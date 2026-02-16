import React, { useState } from 'react';
import { Plus, DollarSign, Calendar, User, Tag, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useDealsByLeadId, useCreateDeal, useArchiveDeal } from '@/hooks/useDeals';
import { CreateDealModal } from '@/components/deals/CreateDealModal';
import { useAuth } from '@/hooks/useAuth';
import type { Lead } from '@/lib/api/leads';
import type { Deal } from '@/lib/api/deals';

interface LeadDealsProps {
  lead: Lead;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Publishing':
      return '📚';
    case 'Marketing':
      return '📢';
    case 'Event':
      return '🎤';
    default:
      return '💼';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Publishing':
      return 'bg-blue-100 text-blue-800';
    case 'Marketing':
      return 'bg-green-100 text-green-800';
    case 'Event':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const LeadDeals: React.FC<LeadDealsProps> = ({ lead }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { data: deals = [], isLoading } = useDealsByLeadId(lead.id);
  const createDealMutation = useCreateDeal();
  const archiveDealMutation = useArchiveDeal();
  const { session } = useAuth();

  const handleCreateDeal = async (dealData: any) => {
    try {
      await createDealMutation.mutateAsync(dealData);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create deal:', error);
    }
  };

  const handleArchiveDeal = async (dealId: string) => {
    if (window.confirm('Archive this deal? It will be hidden and can be restored by an admin. After 30 days, it can be permanently deleted.')) {
      try {
        await archiveDealMutation.mutateAsync({ id: dealId, deletedBy: session?.user?.id || '' });
      } catch (error) {
        console.error('Failed to archive deal:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Deals</h3>
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Deal
          </Button>
        </div>
        <div className="text-center py-8 text-gray-500">Loading deals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Deals ({deals.length})</h3>
        <Button 
          size="sm" 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={createDealMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Deal
        </Button>
      </div>

      {deals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <DollarSign className="h-12 w-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h4>
            <p className="text-gray-600 mb-4">
              Create your first deal for this lead to start tracking opportunities.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deals.map((deal: Deal) => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{deal.offer_title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getCategoryColor(deal.category || '')}>
                        {getCategoryIcon(deal.category || '')} {deal.category}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        style={{ 
                          borderColor: deal.status?.color, 
                          color: deal.status?.color 
                        }}
                      >
                        {deal.status?.name}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveDeal(deal.id)}
                      disabled={archiveDealMutation.isPending}
                      title="Archive deal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-gray-600">Value</p>
                      <p className="font-medium">
                        ${deal.deal_value?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-gray-600">Assigned</p>
                      {deal.assigned_to_profile ? (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={deal.assigned_to_profile.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {deal.assigned_to_profile.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {deal.assigned_to_profile.full_name || 'Unknown'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-gray-400">Unassigned</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(deal.created_at || ''), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-gray-600">Created by</p>
                      <p className="font-medium">
                        {deal.created_by_profile?.full_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {deal.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{deal.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateDealModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateDeal}
        isLoading={createDealMutation.isPending}
        initialData={{
          author_name: lead.author_name,
        }}
      />
    </div>
  );
}; 
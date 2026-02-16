import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Building2, 
  Megaphone, 
  Briefcase,
  ExternalLink,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays, startOfToday } from 'date-fns';
import type { Deal } from '@/lib/api/deals';

interface PipelineTableViewProps {
  deals: Deal[];
  filter?: 'stale' | 'stuck' | 'all';
  onDealClick: (deal: Deal) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'Publishing': { icon: Building2, color: 'bg-blue-100 text-blue-700' },
  'Marketing': { icon: Megaphone, color: 'bg-green-100 text-green-700' },
  'Event': { icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
};

export const PipelineTableView: React.FC<PipelineTableViewProps> = ({ 
  deals, 
  filter = 'all',
  onDealClick 
}) => {
  const navigate = useNavigate();
  const today = startOfToday();

  // Filter deals based on attention type
  const filteredDeals = React.useMemo(() => {
    if (filter === 'all') return deals;

    return deals.filter(deal => {
      const statusName = deal.status?.name?.toLowerCase() || '';
      const isClosedOrDead = statusName.includes('closed') || statusName.includes('lost') || statusName.includes('dead');

      if (filter === 'stale') {
        // Stale: no update in 14+ days, not closed
        if (isClosedOrDead) return false;
        const lastUpdate = new Date(deal.updated_at!);
        return differenceInDays(today, lastUpdate) >= 14;
      }

      if (filter === 'stuck') {
        // Stuck: in early stages 7+ days
        if (!statusName.includes('new') && !statusName.includes('contacted')) {
          return false;
        }
        const created = new Date(deal.created_at!);
        return differenceInDays(today, created) >= 7;
      }

      return true;
    });
  }, [deals, filter, today]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDaysIndicator = (deal: Deal) => {
    const statusName = deal.status?.name?.toLowerCase() || '';
    
    if (filter === 'stale') {
      const days = differenceInDays(today, new Date(deal.updated_at!));
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Clock className="h-3 w-3 mr-1" />
          {days} days stale
        </Badge>
      );
    }

    if (filter === 'stuck') {
      const days = differenceInDays(today, new Date(deal.created_at!));
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {days} days in {deal.status?.name}
        </Badge>
      );
    }

    return null;
  };

  const getFilterTitle = () => {
    switch (filter) {
      case 'stale':
        return 'Stale Deals - No Activity in 14+ Days';
      case 'stuck':
        return 'Deals Needing Progress - Stuck in Early Stages';
      default:
        return 'All Deals';
    }
  };

  const getFilterDescription = () => {
    switch (filter) {
      case 'stale':
        return `${filteredDeals.length} deal${filteredDeals.length !== 1 ? 's' : ''} haven't been updated in over 14 days`;
      case 'stuck':
        return `${filteredDeals.length} deal${filteredDeals.length !== 1 ? 's' : ''} have been in early stages for 7+ days`;
      default:
        return `${filteredDeals.length} total deals`;
    }
  };

  if (filteredDeals.length === 0) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            {filter === 'stale' && <Clock className="h-12 w-12 mx-auto" />}
            {filter === 'stuck' && <AlertTriangle className="h-12 w-12 mx-auto" />}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
          <p className="text-gray-500">
            {filter === 'stale' && 'Great! All your deals have recent activity.'}
            {filter === 'stuck' && 'Great! No deals are stuck in early stages.'}
            {filter === 'all' && 'No deals match your current filters.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader className="border-b border-gray-200/60">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {filter === 'stale' && <Clock className="h-5 w-5 text-orange-600" />}
              {filter === 'stuck' && <AlertTriangle className="h-5 w-5 text-purple-600" />}
              {getFilterTitle()}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">{getFilterDescription()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold">Deal</TableHead>
                <TableHead className="font-semibold">Lead</TableHead>
                <TableHead className="font-semibold">Value</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Assigned To</TableHead>
                <TableHead className="font-semibold">Attention</TableHead>
                <TableHead className="font-semibold">Last Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals.map((deal) => {
                const CategoryIcon = deal.category ? CATEGORY_CONFIG[deal.category]?.icon : null;
                const categoryColor = deal.category ? CATEGORY_CONFIG[deal.category]?.color : 'bg-gray-100 text-gray-700';

                return (
                  <TableRow 
                    key={deal.id} 
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => onDealClick(deal)}
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900">{deal.offer_title || 'Untitled Deal'}</div>
                    </TableCell>
                    <TableCell>
                      {deal.lead ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/leads/${deal.lead.id}`);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          {deal.lead.author_name || `${deal.lead.first_name || ''} ${deal.lead.last_name || ''}`.trim() || 'Unknown'}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">No lead</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold text-green-700">
                        <DollarSign className="h-4 w-4" />
                        {deal.deal_value ? formatCurrency(deal.deal_value) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={{ 
                          backgroundColor: deal.status?.color ? `${deal.status.color}20` : undefined,
                          color: deal.status?.color,
                          borderColor: deal.status?.color
                        }}
                        variant="outline"
                      >
                        {deal.status?.name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deal.category ? (
                        <Badge variant="secondary" className={categoryColor}>
                          {CategoryIcon && <CategoryIcon className="h-3 w-3 mr-1" />}
                          {deal.category}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {deal.assigned_profile ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={deal.assigned_profile.avatar_url || ''} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                              {getInitials(deal.assigned_profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{deal.assigned_profile.full_name || deal.assigned_profile.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getDaysIndicator(deal)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(deal.updated_at!), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/deals/${deal.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, DollarSign, User, Tag, Building2, Briefcase, Megaphone, Edit, MoreHorizontal, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Deal } from '@/lib/api/deals';

interface PipelineDealCardProps {
  deal: Deal;
  onClick?: () => void;
  onEdit?: (event: React.MouseEvent) => void;
  isDragging?: boolean;
}

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

export const PipelineDealCard: React.FC<PipelineDealCardProps> = ({
  deal,
  onClick,
  onEdit,
  isDragging = false,
}) => {
  const navigate = useNavigate();

  const [{ isDragging: dragState }, drag] = useDrag({
    type: 'deal',
    item: { id: deal.id, type: 'deal' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const CategoryIcon = getCategoryIcon(deal.category);

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
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

  const handleViewLead = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/leads/${deal.lead_id}`);
  };

  const handleViewDeal = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/deals/${deal.id}`);
  };

  return (
    <div
      ref={drag}
      className={`cursor-pointer transition-all duration-200 group ${
        dragState || isDragging 
          ? 'opacity-50 scale-95 rotate-2' 
          : 'hover:scale-[1.02] hover:shadow-lg'
      }`}
      onClick={onClick}
    >
      <Card className="border border-gray-200/80 hover:border-gray-300 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with Actions */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate text-sm leading-tight">
                  {deal.offer_title}
                </h4>
                <p className="text-xs text-gray-600 truncate mt-1">
                  {deal.lead?.author_name} • {deal.lead?.book_title}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleViewDeal}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Deal Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewLead}>
                    <User className="h-4 w-4 mr-2" />
                    View Lead Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Deal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Deal Value - Prominent Display */}
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-bold text-green-700 text-sm">
                {formatCurrency(deal.deal_value)}
              </span>
            </div>

            {/* Category Badge */}
            {deal.category && (
              <div className="flex items-center gap-2">
                <Badge className={`text-xs font-medium ${getCategoryColor(deal.category)}`}>
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {deal.category}
                </Badge>
              </div>
            )}

            {/* Assignment Info */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <User className="h-3 w-3 text-gray-500 shrink-0" />
              {deal.assigned_to_profile ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={deal.assigned_to_profile.avatar_url || ''} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(deal.assigned_to_profile.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-700 truncate font-medium">
                    {deal.assigned_to_profile.full_name || deal.assigned_to_profile.email}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-500 font-medium">Unassigned</span>
              )}
            </div>

            {/* Created Date */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>
                Created {formatDistanceToNow(new Date(deal.created_at || ''), { addSuffix: true })}
              </span>
            </div>

            {/* Hover Actions Bar */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-600 hover:text-blue-600"
                onClick={handleViewDeal}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-600 hover:text-green-600"
                onClick={onEdit}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
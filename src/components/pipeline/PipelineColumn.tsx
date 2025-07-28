import React from 'react';
import { useDrop } from 'react-dnd';
import { PipelineDealCard } from './PipelineDealCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Deal } from '@/lib/api/deals';
import type { Status } from '@/lib/api/statuses';

interface PipelineColumnProps {
  status: Status;
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onDealEdit: (deal: Deal, event?: React.MouseEvent) => void;
  onDealMove: (dealId: string, newStatusId: string) => void;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({
  status,
  deals,
  onDealClick,
  onDealEdit,
  onDealMove,
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'deal',
    drop: (item: { id: string; type: string }) => {
      if (item.type === 'deal') {
        onDealMove(item.id, status.id);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // Calculate column metrics
  const columnValue = deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div ref={drop} className="h-full flex flex-col">
      <Card className={`h-full flex flex-col transition-all duration-200 ${
        isOver 
          ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg scale-[1.02] bg-blue-50/50' 
          : 'bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-sm hover:shadow-md'
      }`}>
        <CardHeader className="flex-shrink-0 pb-3 bg-white/60 backdrop-blur-sm border-b border-gray-200/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shadow-sm border-2 border-white"
                style={{ backgroundColor: status.color }}
              />
              <CardTitle className="text-sm font-semibold text-gray-800">{status.name}</CardTitle>
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
            >
              {deals.length}
            </Badge>
          </div>
          
          {columnValue > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                {formatCurrency(columnValue)}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 p-4 pt-3 overflow-hidden">
          <div className="space-y-3 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {deals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                <div className="text-center p-4">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${status.color}20` }}
                  >
                    <Plus className="h-6 w-6" style={{ color: status.color }} />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No deals</p>
                  <p className="text-xs text-gray-500">Drag deals here or create new ones</p>
                </div>
              </div>
            ) : (
              deals.map((deal) => (
                <PipelineDealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onDealClick(deal)}
                  onEdit={(event) => onDealEdit(deal, event)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
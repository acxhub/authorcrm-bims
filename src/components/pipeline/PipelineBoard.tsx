import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PipelineColumn } from './PipelineColumn';
import { EditPipelineDealModal } from './EditPipelineDealModal';
import { CreateDealModal } from '@/components/deals/CreateDealModal';
import { useDeals, useUpdateDeal, useCreateDeal } from '@/hooks/useDeals';
import { useStatuses } from '@/hooks/useStatuses';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DollarSign, TrendingUp, Users, Target, Plus, Filter, RefreshCw, X, Building2, Megaphone, Briefcase, UserCheck, FilterX, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Deal, CreateDealData, UpdateDealData, DealsFilter } from '@/lib/api/deals';

const CATEGORIES = [
  { value: 'Publishing', label: 'Publishing', icon: Building2, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'Marketing', label: 'Marketing', icon: Megaphone, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'Event', label: 'Event', icon: Briefcase, color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export const PipelineBoard: React.FC = () => {
  const navigate = useNavigate();
  
  // Filter state
  const [filters, setFilters] = useState<DealsFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: dealsData, isLoading: dealsLoading, refetch } = useDeals(filters, 1, 1000);
  const { data: statuses = [], isLoading: statusesLoading } = useStatuses();
  const { users = [] } = useUsers({}, 1, 1000); // Fetch all users for assignment dropdown
  const updateDealMutation = useUpdateDeal();
  const createDealMutation = useCreateDeal();

  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const deals = dealsData?.data || [];

  const handleDealClick = (deal: Deal) => {
    navigate(`/deals/${deal.id}`);
  };

  const handleDealEdit = (deal: Deal, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingDeal(deal);
  };

  const handleDealMove = async (dealId: string, newStatusId: string) => {
    try {
      await updateDealMutation.mutateAsync({
        id: dealId,
        data: { status_id: newStatusId }
      });
    } catch (error) {
      console.error('Failed to move deal:', error);
    }
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

  const handleCreateDeal = async (data: CreateDealData) => {
    try {
      await createDealMutation.mutateAsync(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create deal:', error);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Filter handlers
  const handleUserFilter = (userId: string) => {
    setFilters(prev => ({
      ...prev,
      assigned_to: userId === 'all' ? undefined : userId
    }));
  };

  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: category === 'all' ? undefined : category
    }));
  };

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setDateRange({ from, to });
    setFilters(prev => ({
      ...prev,
      date_from: from ? format(from, 'yyyy-MM-dd') : undefined,
      date_to: to ? format(to, 'yyyy-MM-dd') : undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof DealsFilter] !== undefined);

  // Group deals by status
  const dealsByStatus = deals.reduce((acc, deal) => {
    const statusId = deal.status_id;
    if (!acc[statusId]) {
      acc[statusId] = [];
    }
    acc[statusId].push(deal);
    return acc;
  }, {} as Record<string, Deal[]>);

  // Calculate pipeline metrics
  const totalValue = deals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
  const totalDeals = deals.length;
  const assignedDeals = deals.filter(deal => deal.assigned_to).length;
  const avgDealValue = totalDeals > 0 ? totalValue / totalDeals : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (dealsLoading || statusesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <div className="text-gray-500">Loading pipeline...</div>
        </div>
      </div>
    );
  }

  // Sort statuses by order_index
  const sortedStatuses = [...statuses].sort((a, b) => a.order_index - b.order_index);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Enhanced Pipeline Header with Filters - Fixed at top */}
        <div className="flex-shrink-0 p-6 pb-4 bg-white/50 backdrop-blur-sm border-b border-gray-200/60">
          <div className="space-y-4">
            {/* Title and Actions Row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sales Pipeline</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {totalDeals} deals • {formatCurrency(totalValue)} total value
                  {hasActiveFilters && (
                    <span className="ml-2 text-blue-600 font-medium">
                      (filtered)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={dealsLoading}
                  className="bg-white/80 backdrop-blur-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${dealsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-blue-600 hover:bg-blue-700" : "bg-white/80 backdrop-blur-sm"}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs bg-blue-100 text-blue-700">
                      {Object.keys(filters).filter(key => filters[key as keyof DealsFilter] !== undefined).length}
                    </Badge>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Deal
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/60 p-4 animate-in slide-in-from-top-2 duration-200 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Assigned to:</span>
                    <Select value={filters.assigned_to || 'all'} onValueChange={handleUserFilter}>
                      <SelectTrigger className="w-48 bg-white">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        <SelectItem value="all">All users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Category:</span>
                    <Select value={filters.category || 'all'} onValueChange={handleCategoryFilter}>
                      <SelectTrigger className="w-48 bg-white">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {CATEGORIES.map((category) => {
                          const Icon = category.icon;
                          return (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {category.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Date Range:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-64 justify-start text-left font-normal bg-white"
                        >
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "PPP")} -{" "}
                                {format(dateRange.to, "PPP")}
                              </>
                            ) : (
                              format(dateRange.from, "PPP")
                            )
                          ) : (
                            <span className="text-gray-500">Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => {
                            if (range) {
                              handleDateRangeChange(range.from, range.to);
                            }
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-500 hover:text-gray-700 ml-auto"
                    >
                      <FilterX className="h-4 w-4 mr-2" />
                      Clear all filters
                    </Button>
                  )}
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <span className="text-xs font-medium text-gray-500">Active filters:</span>
                    {filters.assigned_to && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        User: {users.find(u => u.id === filters.assigned_to)?.full_name || 'Unknown'}
                        <button
                          onClick={() => handleUserFilter('all')}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.category && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Category: {filters.category}
                        <button
                          onClick={() => handleCategoryFilter('all')}
                          className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {(filters.date_from || filters.date_to) && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        Date: {dateRange.from && format(dateRange.from, "MMM dd")}
                        {dateRange.to && ` - ${format(dateRange.to, "MMM dd")}`}
                        <button
                          onClick={() => handleDateRangeChange(undefined, undefined)}
                          className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Pipeline Metrics */}
        <div className="flex-shrink-0 px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-xl shadow-sm">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Total Pipeline Value</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(totalValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Deals</p>
                    <p className="text-2xl font-bold text-blue-900">{totalDeals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-xl shadow-sm">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700">Avg Deal Value</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(avgDealValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-xl shadow-sm">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-700">Assigned Deals</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {assignedDeals}/{totalDeals}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pipeline Board - Only this section scrolls */}
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          <Card className="h-full bg-white/60 backdrop-blur-sm border-gray-200/60 shadow-lg flex flex-col relative">
            <CardHeader className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Sales Pipeline
                {hasActiveFilters && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Filtered
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
              <div className="h-full overflow-x-auto overflow-y-hidden p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 transition-colors">
                {totalDeals === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {hasActiveFilters ? 'No deals match your filters' : 'No deals in pipeline'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {hasActiveFilters 
                          ? 'Try adjusting your filters or create a new deal.'
                          : 'Get started by creating your first deal.'
                        }
                      </p>
                      {hasActiveFilters ? (
                        <Button variant="outline" onClick={clearFilters}>
                          <FilterX className="h-4 w-4 mr-2" />
                          Clear filters
                        </Button>
                      ) : (
                        <Button onClick={() => setShowCreateModal(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Deal
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-6 h-full">
                    {sortedStatuses
                      .map((status) => (
                      <div key={status.id} className="flex-shrink-0 w-[340px] h-full">
                        <PipelineColumn
                          status={status}
                          deals={dealsByStatus[status.id] || []}
                          onDealClick={handleDealClick}
                          onDealEdit={handleDealEdit}
                          onDealMove={handleDealMove}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Deal Modal */}
        <EditPipelineDealModal
          open={!!editingDeal}
          onClose={() => setEditingDeal(null)}
          deal={editingDeal}
          onSave={handleEditSave}
          isLoading={updateDealMutation.isPending}
        />

        {/* Create Deal Modal */}
        <CreateDealModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateDeal}
          isLoading={createDealMutation.isPending}
        />
      </div>
    </DndProvider>
  );
}; 
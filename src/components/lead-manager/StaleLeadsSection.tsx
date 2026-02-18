import React, { useState } from 'react';
import { Clock, AlertCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadsModal } from './LeadsModal';

interface StaleLeadsSectionProps {
  staleDays: number;
  onStaleDaysChange: (days: number) => void;
  neverTouchedCount: number;
  wentColdCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export const StaleLeadsSection: React.FC<StaleLeadsSectionProps> = ({
  staleDays,
  onStaleDaysChange,
  neverTouchedCount,
  wentColdCount,
  isLoading,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'never-touched' | 'went-cold'>('never-touched');
  const [showNeverTouchedModal, setShowNeverTouchedModal] = useState(false);
  const [showWentColdModal, setShowWentColdModal] = useState(false);

  const staleDaysOptions = [
    { value: '30', label: '30 days' },
    { value: '60', label: '60 days' },
    { value: '90', label: '90 days' },
    { value: '120', label: '120 days' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Stale Leads Management
              </CardTitle>
              <CardDescription>
                Identify and manage leads that need attention
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={staleDays.toString()} 
                onValueChange={(v) => onStaleDaysChange(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staleDaysOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="never-touched" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Never Touched
                <Badge variant={neverTouchedCount > 0 ? 'destructive' : 'secondary'}>
                  {neverTouchedCount.toLocaleString()}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="went-cold" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Went Cold
                <Badge variant={wentColdCount > 0 ? 'default' : 'secondary'} className={wentColdCount > 0 ? 'bg-yellow-500' : ''}>
                  {wentColdCount.toLocaleString()}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="never-touched">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900">Never Touched Leads</h4>
                      <p className="text-sm text-red-700 mt-1">
                        These leads have <strong>zero activities</strong> recorded. They may have been imported 
                        but never contacted, or their activities weren't logged in the system.
                      </p>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="text-2xl font-bold text-red-600">
                          {neverTouchedCount.toLocaleString()}
                        </div>
                        <span className="text-sm text-red-600">leads need attention</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowNeverTouchedModal(true)}
                    disabled={neverTouchedCount === 0}
                  >
                    View & Manage Never Touched Leads
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Recommended actions:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Assign leads to active sales agents</li>
                    <li>Add "Needs Contact" tag for tracking</li>
                    <li>Review if leads are still valid</li>
                    <li>Archive invalid or duplicate leads</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="went-cold">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900">Went Cold Leads</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        These leads <strong>had activity</strong> but haven't been touched in the last{' '}
                        <strong>{staleDays} days</strong>. They may need follow-up or re-engagement.
                      </p>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="text-2xl font-bold text-yellow-600">
                          {wentColdCount.toLocaleString()}
                        </div>
                        <span className="text-sm text-yellow-600">leads went cold</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowWentColdModal(true)}
                    disabled={wentColdCount === 0}
                    variant="outline"
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  >
                    View & Manage Went Cold Leads
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Recommended actions:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Review last activity and follow up</li>
                    <li>Reassign to different agent if needed</li>
                    <li>Add "Re-engagement" tag for campaigns</li>
                    <li>Update status based on last interaction</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <LeadsModal
        open={showNeverTouchedModal}
        onClose={() => setShowNeverTouchedModal(false)}
        title="Never Touched Leads"
        description={`${neverTouchedCount} leads with zero activities`}
        filterType="never-touched"
      />

      <LeadsModal
        open={showWentColdModal}
        onClose={() => setShowWentColdModal(false)}
        title="Went Cold Leads"
        description={`${wentColdCount} leads with no activity in ${staleDays}+ days`}
        filterType="went-cold"
        staleDays={staleDays}
      />
    </>
  );
};

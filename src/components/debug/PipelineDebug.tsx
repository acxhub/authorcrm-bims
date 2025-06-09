import React from 'react';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { useDeals } from '@/hooks/useDeals';
import { useStatuses } from '@/hooks/useStatuses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const PipelineDebug: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: dealsData, isLoading: dealsLoading, error: dealsError } = useDeals({}, 1, 1000);
  const { data: statuses = [] } = useStatuses();

  const deals = dealsData?.data || [];

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Info */}
          <div>
            <h3 className="font-semibold mb-2">Current User:</h3>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><strong>ID:</strong> {user?.id}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {profile?.role}</p>
              <p><strong>Full Name:</strong> {profile?.full_name}</p>
              <p><strong>Is Active:</strong> {profile?.is_active ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Deals Query Status */}
          <div>
            <h3 className="font-semibold mb-2">Deals Query:</h3>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><strong>Loading:</strong> {dealsLoading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {dealsError ? dealsError.message : 'None'}</p>
              <p><strong>Total Deals Returned:</strong> {deals.length}</p>
              <p><strong>Total Count:</strong> {dealsData?.count || 0}</p>
            </div>
          </div>

          {/* Statuses */}
          <div>
            <h3 className="font-semibold mb-2">Available Statuses:</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <Badge key={status.id} variant="outline">
                  {status.name} (Order: {status.order_index})
                </Badge>
              ))}
            </div>
          </div>

          {/* Deals by Status */}
          {deals.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Deals by Status:</h3>
              <div className="space-y-2">
                {statuses.map(status => {
                  const statusDeals = deals.filter(deal => deal.status_id === status.id);
                  return (
                    <div key={status.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span>{status.name}</span>
                      <Badge variant="secondary">{statusDeals.length} deals</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sample Deals */}
          {deals.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Sample Deals:</h3>
              <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                {deals.slice(0, 5).map(deal => (
                  <div key={deal.id} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                    <p><strong>Title:</strong> {deal.offer_title}</p>
                    <p><strong>Value:</strong> ${deal.deal_value}</p>
                    <p><strong>Status:</strong> {deal.status?.name}</p>
                    <p><strong>Assigned To:</strong> {deal.assigned_to_profile?.full_name || 'Unassigned'}</p>
                  </div>
                ))}
                {deals.length > 5 && <p className="text-gray-500">...and {deals.length - 5} more</p>}
              </div>
            </div>
          )}

          {/* Raw Response */}
          <details>
            <summary className="font-semibold cursor-pointer">Raw Response Data</summary>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60 mt-2">
              {JSON.stringify({ dealsData, error: dealsError }, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}; 
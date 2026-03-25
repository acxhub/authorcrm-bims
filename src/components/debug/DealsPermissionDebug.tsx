import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDeals } from '@/hooks/useDeals';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, User, Shield } from 'lucide-react';
import { getLeadDisplayName } from '@/lib/lead-display';

export const DealsPermissionDebug: React.FC = () => {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: dealsData, isLoading, error, refetch } = useDeals({});

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'leads_manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sales_manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Deals Permission Debug Tool
            </CardTitle>
            <Button onClick={handleRefresh} disabled={isLoading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Current User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <span className="ml-2 text-sm text-gray-600">{user?.email || 'Not authenticated'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">User ID:</span>
                  <span className="ml-2 text-sm text-gray-600 font-mono">{user?.id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Role:</span>
                  {profile?.role ? (
                    <Badge className={`ml-2 ${getRoleColor(profile.role)}`}>
                      {profile.role}
                    </Badge>
                  ) : (
                    <span className="ml-2 text-sm text-red-600">No role assigned</span>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">Active:</span>
                  {profile?.is_active ? (
                    <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-100 text-red-800 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      No
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Last Refresh:</span>
                  <span className="ml-2 text-sm text-gray-600">{formatTime(lastRefresh)}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Loading:</span>
                  {isLoading ? (
                    <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200">
                      Loading...
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                      Complete
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">Deals Count:</span>
                  <span className="ml-2 text-sm text-gray-600">
                    {dealsData?.data?.length || 0} deals found
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Total Count:</span>
                  <span className="ml-2 text-sm text-gray-600">
                    {dealsData?.count || 0} total deals
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Display */}
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Error fetching deals:</p>
                  <p className="text-sm text-red-600 font-mono">
                    {error instanceof Error ? error.message : String(error)}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Expected vs Actual Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expected Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile?.role === 'leads_manager' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Leads Manager</strong> should be able to:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                        <li>View ALL deals in the system</li>
                        <li>Create new deals</li>
                        <li>Update any deal</li>
                        <li>Delete any deal</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {profile?.role === 'sales_manager' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sales Manager</strong> should be able to:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                        <li>View ALL deals in the system</li>
                        <li>Create new deals</li>
                        <li>Update any deal</li>
                        <li>Delete any deal</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {profile?.role === 'sales' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sales Agent</strong> (RLS): access deals only when the parent lead is assigned to them;
                      create/update those deals. No access to other reps&apos; leads or deals. Archive/restore leads
                      via managers only; recycle own assigned leads or any lead if manager.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actual Results */}
          {dealsData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actual Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">
                      Found {dealsData.data.length} deals (out of {dealsData.count} total)
                    </p>
                  </div>

                  {dealsData.data.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Sample deals:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {dealsData.data.slice(0, 5).map((deal) => (
                          <div key={deal.id} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{deal.offer_title}</p>
                                <p className="text-xs text-gray-600">
                                  Lead: {deal.lead ? getLeadDisplayName(deal.lead) : '—'} • Created by: {deal.created_by_profile?.email}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">
                                  ${deal.deal_value?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {deal.assigned_to_profile?.email || 'Unassigned'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {dealsData.data.length > 5 && (
                        <p className="text-xs text-gray-500">
                          ... and {dealsData.data.length - 5} more deals
                        </p>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>No deals found!</strong>
                        <br />
                        This could indicate a permission issue or that no deals exist in the system.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Troubleshooting Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">If you see no deals:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-gray-600">
                    <li>Check that deals exist in the database</li>
                    <li>Verify your user role is correctly set</li>
                    <li>Ensure your user account is active (is_active = true)</li>
                    <li>Check Row Level Security policies on the deals table</li>
                  </ul>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Database queries to run:</p>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                    <p>-- Check total deals in database</p>
                    <p>SELECT COUNT(*) FROM deals;</p>
                    <br />
                    <p>-- Check your profile</p>
                    <p>SELECT role, is_active FROM profiles WHERE id = auth.uid();</p>
                    <br />
                    <p>-- Check policies</p>
                    <p>SELECT policyname, cmd FROM pg_policies WHERE tablename = 'deals';</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}; 
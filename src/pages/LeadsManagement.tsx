import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeadsList } from '@/components/leads/LeadsList';
import { LeadForm } from '@/components/leads/LeadForm';
import { LeadDetails } from '@/components/leads/LeadDetails';
import { StatusManagement } from '@/components/admin/StatusManagement';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useStatuses } from '@/hooks/useStatuses';
import type { Lead } from '@/lib/api/leads';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Plus, Download, Bell, Settings, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';

type ModalState = 'closed' | 'create' | 'edit' | 'view';

export const LeadsManagement: React.FC = () => {
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showStatusManagement, setShowStatusManagement] = useState(false);

  const { data: statuses, refetch: refetchStatuses } = useStatuses();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { user } = useAuth();
  const { profile } = useProfile();

  const handleCreateLead = () => {
    if (!statuses?.length) {
      setShowStatusManagement(true);
      return;
    }
    setSelectedLead(null);
    setModalState('create');
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalState('edit');
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalState('view');
  };

  const handleCloseModal = () => {
    setModalState('closed');
    setSelectedLead(null);
  };

  const handleSubmitForm = async (data: any) => {
    try {
      if (modalState === 'create') {
        // Get the first status (New Lead) as default
        const defaultStatus = statuses?.find(s => s.order_index === 1);
        const createData = {
          ...data,
          status_id: data.status_id || defaultStatus?.id || '',
          created_by: user?.id,
        };
        
        console.log('Creating lead with data:', createData);
        await createLead.mutateAsync(createData);
      } else if (modalState === 'edit' && selectedLead) {
        console.log('Updating lead with data:', { id: selectedLead.id, data });
        await updateLead.mutateAsync({
          id: selectedLead.id,
          data,
        });
      }
      handleCloseModal();
    } catch (error) {
      // Enhanced error logging
      console.error('Form submission error:', error);
      console.error('User context:', { user, profile });
      console.error('Modal state:', modalState);
      console.error('Form data:', data);
    }
  };

  const handleStatusesUpdated = async () => {
    await refetchStatuses();
    setShowStatusManagement(false);
  };

  const isFormLoading = createLead.isPending || updateLead.isPending;

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
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {showStatusManagement ? 'Pipeline Configuration' : 'Leads Management'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {showStatusManagement 
                      ? 'Configure your sales pipeline statuses.'
                      : 'View, create, and manage all author/book leads.'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!showStatusManagement && (
                  <>
                    <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm">
                      <Bell className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/60 backdrop-blur-sm"
                      onClick={() => setShowStatusManagement(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Statuses
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl" 
                      onClick={handleCreateLead}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lead
                    </Button>
                  </>
                )}
                {showStatusManagement && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowStatusManagement(false)}
                  >
                    Back to Leads
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="p-6 space-y-8">
            {/* User Role Warning */}
            {profile && !['leads_manager', 'sales_manager'].includes(profile.role || '') && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="flex items-center justify-between">
                    <span>
                      Your account role ({profile.role || 'unknown'}) may not have permission to create leads. 
                      Contact your administrator if you need access.
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Status Warning */}
            {!statuses?.length && !showStatusManagement && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="flex items-center justify-between">
                    <span>
                      No pipeline statuses configured. You need to set up statuses before creating leads.
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="ml-4"
                      onClick={() => setShowStatusManagement(true)}
                    >
                      Configure Now
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Main Content */}
            {showStatusManagement ? (
              <StatusManagement onStatusesUpdated={handleStatusesUpdated} />
            ) : (
              <LeadsList
                onCreateLead={handleCreateLead}
                onEditLead={handleEditLead}
                onViewLead={handleViewLead}
              />
            )}
          </main>
        </SidebarInset>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalState === 'create' || modalState === 'edit'} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalState === 'create' && 'Create New Lead'}
              {modalState === 'edit' && 'Edit Lead'}
            </DialogTitle>
          </DialogHeader>

          <LeadForm
            lead={selectedLead || undefined}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseModal}
            isLoading={isFormLoading}
          />
        </DialogContent>
      </Dialog>

      {/* View Modal - Full Screen */}
      <Dialog open={modalState === 'view'} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <LeadDetails
              leadId={selectedLead.id}
              onBack={handleCloseModal}
              onEdit={handleEditLead}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}; 
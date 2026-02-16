import { useState, useEffect } from 'react';
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
import { Plus, Download, Upload, Settings, AlertCircle } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ModalState = 'closed' | 'create' | 'edit' | 'view';

export const LeadsManagement: React.FC = () => {
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showStatusManagement, setShowStatusManagement] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: statuses, refetch: refetchStatuses } = useStatuses();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { user } = useAuth();
  const { profile } = useProfile();

  // Handle URL parameters to open create modal
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      handleCreateLead();
      // Remove the query parameter after handling it
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, []);

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

  const handleStatusesUpdated = () => {
    refetchStatuses();
    setShowStatusManagement(false);
  };

  const handleSubmitForm = async (data: any) => {
    try {
      if (modalState === 'create') {
        await createLead.mutateAsync({
          ...data,
          created_by: user!.id,
        });
      } else if (modalState === 'edit' && selectedLead) {
        await updateLead.mutateAsync({
          id: selectedLead.id,
          data,
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const getFormInitialData = () => {
    if (modalState === 'edit' && selectedLead) {
      // Transform lead data for the form
      const otherTitles = Array.isArray(selectedLead.other_titles) 
        ? selectedLead.other_titles.map(title => String(title))
        : typeof selectedLead.other_titles === 'string' 
          ? [selectedLead.other_titles]
          : [];

      return {
        ...selectedLead,
        other_titles: otherTitles,
      };
    }
    return undefined;
  };

  const isFormLoading = modalState === 'create' ? createLead.isPending : updateLead.isPending;

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
                  <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                  <p className="text-sm text-gray-600">Manage and track your leads</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!showStatusManagement && (
                  <>
                    <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm" aria-label="Export leads">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/60 backdrop-blur-sm"
                      onClick={() => navigate('/leads/import')}
                      aria-label="Import leads"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                    <NotificationBell />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/60 backdrop-blur-sm"
                      onClick={() => setShowStatusManagement(true)}
                      aria-label="Manage statuses"
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

          {/* Main Content */}
          <main className="p-6">
            {!statuses?.length && !showStatusManagement && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please set up your lead statuses before adding leads.{' '}
                  <button
                    onClick={() => setShowStatusManagement(true)}
                    className="font-medium underline hover:text-blue-600"
                  >
                    Set up now
                  </button>
                </AlertDescription>
              </Alert>
            )}

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
            initialData={getFormInitialData()}
            onSubmit={handleSubmitForm}
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
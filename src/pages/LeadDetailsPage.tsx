import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { LeadDetails } from '@/components/leads/LeadDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/leads');
  };

  const handleEdit = () => {
    // Navigate to edit mode or open edit modal
    navigate(`/leads/${id}/edit`);
  };

  if (!id) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="text-lg font-medium text-red-600">Invalid Lead ID</div>
                <div className="text-sm text-gray-500 mt-1">
                  No lead ID provided in the URL
                </div>
                <Button variant="outline" onClick={handleBack} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Leads
                </Button>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

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
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h1 className="text-xl font-semibold text-gray-900">Lead Details</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Leads
                </Button>
              </div>
            </div>
          </header>
          
          <main className="p-6">
            <LeadDetails
              leadId={id}
              onBack={handleBack}
              onEdit={handleEdit}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default LeadDetailsPage; 
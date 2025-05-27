import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { LeadDetails } from '@/components/leads/LeadDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeadForm } from '@/components/leads/LeadForm';
import { useLead, useUpdateLead } from '@/hooks/useLeads';

const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const { data: lead, isLoading } = useLead(id!);
  const updateLead = useUpdateLead();

  const handleBack = () => {
    navigate('/leads');
  };

  const handleEdit = () => {
    setEditOpen(true);
  };

  const handleEditSubmit = async (data: any) => {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, data });
      setEditOpen(false);
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  // Transform lead data for the form
  const getFormInitialData = () => {
    if (!lead) return undefined;
    
    // Safely convert other_titles from Json to string[]
    let otherTitles: string[] = [];
    if (lead.other_titles) {
      if (Array.isArray(lead.other_titles)) {
        otherTitles = lead.other_titles.filter((title): title is string => typeof title === 'string');
      } else if (typeof lead.other_titles === 'string') {
        otherTitles = [lead.other_titles];
      }
    }
    
    return {
      book_title: lead.book_title,
      author_name: lead.author_name,
      amazon_link: lead.amazon_link || '',
      phone_number_1: lead.phone_number_1 || '',
      phone_number_2: lead.phone_number_2 || '',
      primary_email: lead.primary_email || '',
      secondary_email: lead.secondary_email || '',
      author_bio: lead.author_bio || '',
      multiple_titles: lead.multiple_titles || false,
      other_titles: otherTitles,
      status_id: lead.status_id,
      publisher: lead.publisher || '',
      website: lead.website || '',
      state: lead.state || '',
      country: lead.country || '',
    };
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

      {/* Edit Lead Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {lead && (
            <LeadForm
              initialData={getFormInitialData()}
              onSubmit={handleEditSubmit}
              isLoading={updateLead.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default LeadDetailsPage; 
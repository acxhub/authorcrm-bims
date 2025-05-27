import React, { useState } from 'react';
import { ArrowLeft, Edit, ExternalLink, Phone, Mail, Calendar, MapPin, User, Hash, MessageCircle, Activity, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLead } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { LeadAssignment } from './LeadAssignment';
import { LeadTagging } from './LeadTagging';
import { LeadComments } from './LeadComments';
import { LeadActivities } from './LeadActivities';
import { SimpleTagAdd } from './SimpleTagAdd';
import { SimpleLeadAssign } from './SimpleLeadAssign';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/lib/api/leads';

interface LeadDetailsProps {
  leadId: string;
  onBack?: () => void;
  onEdit?: (lead: Lead) => void;
}

export const LeadDetails: React.FC<LeadDetailsProps> = ({ 
  leadId, 
  onBack, 
  onEdit 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [lead, setLead] = useState<Lead | null>(null);

  const { user } = useAuth();
  const { data: leadData, isLoading, error } = useLead(leadId);

  // Update local state when data changes
  React.useEffect(() => {
    if (leadData) {
      setLead(leadData);
    }
  }, [leadData]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAssignmentChange = (assignedTo: string | null) => {
    if (lead) {
      setLead({
        ...lead,
        assigned_to: assignedTo,
        // Note: In a real app, you'd want to refetch the full lead data
        // to get the updated assigned_to_profile
      });
    }
  };

  const handleTagsChange = (tags: any[]) => {
    if (lead) {
      setLead({
        ...lead,
        tags,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">Loading lead details...</div>
          <div className="text-sm text-gray-500 mt-1">Please wait while we fetch the information</div>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Error loading lead</div>
          <div className="text-sm text-gray-500 mt-1">
            {error?.message || 'Lead not found'}
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.book_title}</h1>
            <p className="text-gray-600">by {lead.author_name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(lead)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {lead.primary_email && (
                <DropdownMenuItem onClick={() => window.open(`mailto:${lead.primary_email}`)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
              )}
              {lead.phone_number_1 && (
                <DropdownMenuItem onClick={() => window.open(`tel:${lead.phone_number_1}`)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Primary
                </DropdownMenuItem>
              )}
              {lead.amazon_link && (
                <DropdownMenuItem onClick={() => window.open(lead.amazon_link, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Amazon
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lead Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                    {getInitials(lead.author_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{lead.author_name}</h3>
                  <p className="text-gray-600">{lead.book_title}</p>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <Badge 
                      className="font-medium"
                      style={{ 
                        backgroundColor: `${lead.status.color}20`,
                        color: lead.status.color,
                        borderColor: lead.status.color
                      }}
                    >
                      {lead.status.name}
                    </Badge>
                    
                    {lead.multiple_titles && (
                      <Badge variant="secondary">Multiple Titles</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.primary_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{lead.primary_email}</span>
                  </div>
                )}
                {lead.secondary_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{lead.secondary_email}</span>
                  </div>
                )}
                {lead.phone_number_1 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{lead.phone_number_1}</span>
                  </div>
                )}
                {lead.phone_number_2 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{lead.phone_number_2}</span>
                  </div>
                )}
              </div>

              {/* Quick Assignment */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Assignment</div>
                <SimpleLeadAssign 
                  lead={lead} 
                  onAssignmentChange={handleAssignmentChange}
                />
              </div>

              {/* Quick Tags */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Tags</div>
                <SimpleTagAdd 
                  lead={lead} 
                  onTagsChange={handleTagsChange}
                />
              </div>
            </div>

            {/* Meta Information */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Created</div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatDistanceToNow(new Date(lead.created_at!), { addSuffix: true })} by{' '}
                  {lead.created_by_profile.full_name || 'Unknown User'}
                </div>
              </div>

              {lead.amazon_link && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Amazon Link</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => window.open(lead.amazon_link!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View Book
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Author Bio */}
          {lead.author_bio && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm font-medium text-gray-700 mb-2">Author Bio</div>
              <p className="text-sm text-gray-600 leading-relaxed">{lead.author_bio}</p>
            </div>
          )}

          {/* Other Titles */}
          {lead.multiple_titles && lead.other_titles && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm font-medium text-gray-700 mb-2">Other Titles</div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {(lead.other_titles as string[]).map((title, index) => (
                  <li key={index}>{title}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Assignment
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Comments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <LeadAssignment 
            lead={lead} 
            onAssignmentChange={handleAssignmentChange}
          />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <LeadTagging 
            lead={lead} 
            onTagsChange={handleTagsChange}
          />
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          <LeadActivities lead={lead} />
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <LeadComments lead={lead} />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 
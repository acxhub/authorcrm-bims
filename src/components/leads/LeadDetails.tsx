import React, { useState } from 'react';
import { ArrowLeft, Edit, ExternalLink, Phone, Mail, Calendar, MapPin, User, Hash, MessageCircle, Activity, MoreHorizontal, Globe, Building2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLead } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { LeadComments } from './LeadComments';
import { LeadActivities } from './LeadActivities';
import { LeadDeals } from './LeadDeals';
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
  const [activeTab, setActiveTab] = useState('comments');
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

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handlePhoneClick = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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
                  <DropdownMenuItem onClick={() => handleEmailClick(lead.primary_email!)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                )}
                {lead.phone_number_1 && (
                  <DropdownMenuItem onClick={() => handlePhoneClick(lead.phone_number_1!)}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call Primary
                  </DropdownMenuItem>
                )}
                {lead.amazon_link && (
                  <DropdownMenuItem onClick={() => window.open(lead.amazon_link!, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Amazon
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 p-6">
        {/* Center Content */}
        <div className="flex-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                    {getInitials(lead.author_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{lead.author_name}</h2>
                    <p className="text-lg text-gray-600">{lead.book_title}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
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

                  {/* Contact Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.primary_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <button 
                          onClick={() => handleEmailClick(lead.primary_email!)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {lead.primary_email}
                        </button>
                      </div>
                    )}
                    {lead.secondary_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <button 
                          onClick={() => handleEmailClick(lead.secondary_email!)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {lead.secondary_email}
                        </button>
                      </div>
                    )}
                    {lead.phone_number_1 && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <button 
                          onClick={() => handlePhoneClick(lead.phone_number_1!)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {lead.phone_number_1}
                        </button>
                      </div>
                    )}
                    {lead.phone_number_2 && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <button 
                          onClick={() => handlePhoneClick(lead.phone_number_2!)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {lead.phone_number_2}
                        </button>
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <a 
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {lead.website}
                        </a>
                      </div>
                    )}
                    {lead.publisher && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{lead.publisher}</span>
                      </div>
                    )}
                    {(lead.state || lead.country) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {[lead.state, lead.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Author Bio */}
              {lead.author_bio && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Author Bio</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{lead.author_bio}</p>
                </div>
              )}

              {/* Other Titles */}
              {lead.multiple_titles && lead.other_titles && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Other Titles</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {(lead.other_titles as string[]).map((title, index) => (
                      <li key={index}>{title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Amazon Link */}
              {lead.amazon_link && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Book Link</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(lead.amazon_link!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View on Amazon
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments and Activities Section */}
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="px-6 pt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Comments
                    </TabsTrigger>
                    <TabsTrigger value="activities" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activities
                    </TabsTrigger>
                    <TabsTrigger value="deals" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Deals
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="comments" className="px-6 pb-6 mt-6">
                  <LeadComments lead={lead} />
                </TabsContent>

                <TabsContent value="activities" className="px-6 pb-6 mt-6">
                  <LeadActivities lead={lead} />
                </TabsContent>

                <TabsContent value="deals" className="px-6 pb-6 mt-6">
                  <LeadDeals lead={lead} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.primary_email && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleEmailClick(lead.primary_email!)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              )}
              {lead.phone_number_1 && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handlePhoneClick(lead.phone_number_1!)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Primary
                </Button>
              )}
              {lead.amazon_link && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open(lead.amazon_link!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Amazon
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SimpleLeadAssign 
                  lead={lead} 
                  onAssignmentChange={handleAssignmentChange}
                />
                
                {/* Current Assignment Display */}
                {lead.assigned_to_profile && (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">Currently Assigned To</div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={lead.assigned_to_profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {getInitials(lead.assigned_to_profile?.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        {lead.assigned_to_profile?.full_name || lead.assigned_to_profile?.email || 'Unknown User'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTagAdd 
                lead={lead} 
                onTagsChange={handleTagsChange}
              />
            </CardContent>
          </Card>

          {/* Meta Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Created</div>
                <div className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(lead.created_at!), { addSuffix: true })} by{' '}
                  {lead.created_by_profile?.full_name || 'Unknown User'}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700">Last Updated</div>
                <div className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(lead.updated_at!), { addSuffix: true })}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Status</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: lead.status.color }}
                  />
                  <span className="text-sm text-gray-600">{lead.status.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 
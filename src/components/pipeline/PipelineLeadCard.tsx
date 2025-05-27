import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, User, Calendar } from 'lucide-react';
import type { Lead } from '@/lib/api/leads';

interface PipelineLeadCardProps {
  lead: Lead;
  isDragging?: boolean;
}

export const PipelineLeadCard: React.FC<PipelineLeadCardProps> = ({ lead, isDragging = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isDragging || isSortableDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {lead.book_title}
              </h4>
              <p className="text-sm text-gray-600 truncate">
                by {lead.author_name}
              </p>
            </div>
            <div className="ml-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {getInitials(lead.author_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-1">
            {lead.primary_email && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail className="h-3 w-3" />
                <span className="truncate">{lead.primary_email}</span>
              </div>
            )}
            {lead.phone_number_1 && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="h-3 w-3" />
                <span>{lead.phone_number_1}</span>
              </div>
            )}
          </div>

          {/* Assignment */}
          {lead.assigned_to_profile && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User className="h-3 w-3" />
              <span className="truncate">
                {lead.assigned_to_profile.full_name || 'Assigned User'}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(lead.created_at!)}</span>
            </div>
            
            {lead.multiple_titles && (
              <Badge variant="outline" className="text-xs">
                +{(lead.other_titles as string[])?.length || 0} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
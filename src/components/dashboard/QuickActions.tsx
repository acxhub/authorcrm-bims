import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Users, BarChart3, Settings, FileText, Target, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  disabled?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = 'blue',
  disabled = false
}) => {
  const colorClasses = {
    blue: 'from-blue-50 to-cyan-50 border-blue-200/60 hover:from-blue-100 hover:to-cyan-100',
    green: 'from-green-50 to-emerald-50 border-green-200/60 hover:from-green-100 hover:to-emerald-100',
    purple: 'from-purple-50 to-violet-50 border-purple-200/60 hover:from-purple-100 hover:to-violet-100',
    orange: 'from-orange-50 to-amber-50 border-orange-200/60 hover:from-orange-100 hover:to-amber-100',
    red: 'from-red-50 to-rose-50 border-red-200/60 hover:from-red-100 hover:to-rose-100',
    gray: 'from-gray-50 to-slate-50 border-gray-200/60 hover:from-gray-100 hover:to-slate-100'
  };

  const iconColorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <Card 
      className={`bg-gradient-to-br ${colorClasses[color]} transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${iconColorClasses[color]} flex-shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);

  const isLeadsManager = user?.role === 'leads_manager';
  const isSalesManager = user?.role === 'sales_manager';

  const actions = [
    {
      icon: Plus,
      title: 'Add New Lead',
      description: 'Quickly add a new author or book lead to your pipeline',
      onClick: () => setShowCreateLeadModal(true),
      color: 'blue' as const
    },
    {
      icon: Target,
      title: 'Create Deal',
      description: 'Convert a lead into a deal opportunity',
      onClick: () => navigate('/pipeline'),
      color: 'green' as const
    },
    {
      icon: Upload,
      title: 'Import Leads',
      description: 'Bulk import leads from CSV or Excel files',
      onClick: () => navigate('/leads/import'),
      color: 'purple' as const
    },
    {
      icon: BarChart3,
      title: 'View Pipeline',
      description: 'Manage deals and track progress through stages',
      onClick: () => navigate('/pipeline'),
      color: 'orange' as const
    },
    {
      icon: FileText,
      title: 'Generate Report',
      description: 'Create performance and analytics reports',
      onClick: () => {
        // TODO: Implement reporting functionality
        console.log('Generate report clicked');
      },
      color: 'gray' as const,
      disabled: true
    },
    {
      icon: Mail,
      title: 'Email Campaign',
      description: 'Send targeted emails to your leads',
      onClick: () => {
        // TODO: Implement email campaign functionality
        console.log('Email campaign clicked');
      },
      color: 'red' as const,
      disabled: true
    }
  ];

  // Add admin-only actions
  if (isLeadsManager) {
    actions.push(
      {
        icon: Users,
        title: 'Manage Users',
        description: 'Add, edit, or manage team members',
        onClick: () => navigate('/admin/users'),
        color: 'purple' as const
      },
             {
         icon: Settings,
         title: 'Admin Settings',
         description: 'Configure pipeline stages, tags, and system settings',
         onClick: () => navigate('/admin'),
         color: 'gray' as const,
         disabled: false
       }
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <div
              key={action.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <QuickAction {...action} />
            </div>
          ))}
        </div>
        
        {/* Help Text */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click any action above to get started. Some features may require specific permissions.
          </p>
        </div>
      </CardContent>

      {/* Create Lead Modal */}
      <CreateLeadModal
        open={showCreateLeadModal}
        onClose={() => setShowCreateLeadModal(false)}
      />
    </Card>
  );
}; 
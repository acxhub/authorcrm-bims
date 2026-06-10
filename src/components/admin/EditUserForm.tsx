import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { UserProfile, UserRole, UpdateUserRequest } from '@/lib/api/users';

const updateUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['leads_manager', 'lead_miner', 'sales_manager', 'sales'] as const),
  is_active: z.boolean(),
  force_password_reset: z.boolean().optional(),
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface EditUserFormProps {
  user: UserProfile;
  onSubmit: (data: UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const roleLabels: Record<UserRole, string> = {
  leads_manager: 'Leads Manager',
  lead_miner: 'Lead Miner',
  sales_manager: 'Sales Manager',
  sales: 'Sales',
};

const roleDescriptions: Record<UserRole, string> = {
  leads_manager: 'Full system access, user management, lead import/export',
  lead_miner: 'Create, manage, assign, and import leads only',
  sales_manager: 'Team management, lead assignment, pipeline oversight',
  sales: 'Assigned leads management, activity logging, pipeline updates',
};

export const EditUserForm: React.FC<EditUserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      full_name: user.full_name || '',
      role: user.role || 'sales',
      is_active: user.is_active ?? true,
    },
  });

  const selectedRole = watch('role');

  React.useEffect(() => {
    reset({
      full_name: user.full_name || '',
      role: user.role || 'sales',
      is_active: user.is_active ?? true,
    });
  }, [user, reset]);

  const handleFormSubmit = async (data: UpdateUserFormData) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
        <CardDescription>
          Update user information and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* User Email (Read-only) */}
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="mt-1 bg-gray-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Email cannot be changed after user creation
            </p>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Enter full name"
                className="mt-1"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="role">User Role *</Label>
              <Select
                value={selectedRole}
                onValueChange={(value: UserRole) => setValue('role', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {roleDescriptions[value as UserRole]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Role Information */}
            {selectedRole && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{roleLabels[selectedRole]}:</strong> {roleDescriptions[selectedRole]}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* User Status */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active User
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive users cannot log in to the system
            </p>

            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="force_password_reset"
                checked={watch('force_password_reset')}
                onCheckedChange={(checked) => setValue('force_password_reset', checked)}
              />
              <Label htmlFor="force_password_reset" className="text-sm font-medium">
                Force Password Reset
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              User will be required to change their password on next login
            </p>
          </div>

          {/* User Metadata */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-gray-900">User Information</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 
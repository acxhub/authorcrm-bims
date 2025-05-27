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
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserRole, CreateUserRequest } from '@/lib/api/users';

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['leads_manager', 'sales_manager', 'sales'] as const),
  is_active: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserFormProps {
  onSubmit: (data: CreateUserRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const roleLabels: Record<UserRole, string> = {
  leads_manager: 'Leads Manager',
  sales_manager: 'Sales Manager',
  sales: 'Sales',
};

const roleDescriptions: Record<UserRole, string> = {
  leads_manager: 'Full system access, user management, lead import/export',
  sales_manager: 'Team management, lead assignment, pipeline oversight',
  sales: 'Assigned leads management, activity logging, pipeline updates',
};

export const CreateUserForm: React.FC<CreateUserFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      role: 'sales',
      is_active: true,
    },
  });

  const selectedRole = watch('role');

  const handleFormSubmit = async (data: CreateUserFormData) => {
    const { confirmPassword, ...submitData } = data;
    await onSubmit(submitData as CreateUserRequest);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
        <CardDescription>
          Add a new user to the system with appropriate role and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email address"
                className="mt-1"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter password (min. 8 characters)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Confirm password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
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
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 
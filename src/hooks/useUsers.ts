import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserProfile, type UsersFilter, type CreateUserRequest, type UpdateUserRequest } from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useProfile } from '@/hooks/useAuth';
import { notify } from '@/lib/notifications/notify';

export function useUsers(filters?: UsersFilter, page = 1, limit = 10) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { profile: currentProfile } = useProfile();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', filters, page, limit],
    queryFn: () => usersApi.getAll(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const users = data?.data || [];
  const total = data?.total || 0;
  const loading = isLoading;

  const queryClient = useQueryClient();
  
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserRequest) => usersApi.create(userData),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
  
  const createUser = async (userData: CreateUserRequest): Promise<UserProfile | null> => {
    try {
      const result = await createUserMutation.mutateAsync(userData);
      return result;
    } catch {
      return null;
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateUserRequest }) =>
      usersApi.update(id, updates),
    onSuccess: (updatedUser, { updates }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      if (currentUser?.id && updates.role) {
        notify.userRoleChanged({
          actorId: currentUser.id,
          actorName: currentProfile?.full_name || 'An admin',
          targetUserId: updatedUser.id,
          newRole: updates.role,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
  
  const updateUser = async (id: string, updates: UpdateUserRequest): Promise<UserProfile | null> => {
    try {
      const result = await updateUserMutation.mutateAsync({ id, updates });
      return result;
    } catch {
      return null;
    }
  };

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
  
  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await deleteUserMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const toggleUserStatusMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleStatus(id),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      toast({
        title: 'Success',
        description: `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`,
      });

      if (currentUser?.id) {
        notify.userStatusChanged({
          actorId: currentUser.id,
          actorName: currentProfile?.full_name || 'An admin',
          targetUserId: updatedUser.id,
          isActive: updatedUser.is_active,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
  
  const toggleUserStatus = async (id: string): Promise<boolean> => {
    try {
      await toggleUserStatusMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => 
      usersApi.resetPassword(id, newPassword),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
  
  const resetPassword = async (id: string, newPassword: string): Promise<boolean> => {
    try {
      await resetPasswordMutation.mutateAsync({ id, newPassword });
      return true;
    } catch {
      return false;
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return {
    users,
    total,
    loading,
    error: error?.message || null,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetPassword,
    refresh,
  };
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 
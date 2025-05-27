import { useState, useEffect } from 'react';
import { usersApi, type UserProfile, type UsersFilter, type CreateUserRequest, type UpdateUserRequest } from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';

export function useUsers(filters?: UsersFilter, page = 1, limit = 10) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getAll(filters, page, limit);
      setUsers(response.data);
      setTotal(response.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, page, limit]);

  const createUser = async (userData: CreateUserRequest): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const newUser = await usersApi.create(userData);
      await fetchUsers(); // Refresh the list
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, updates: UpdateUserRequest): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const updatedUser = await usersApi.update(id, updates);
      
      // Update the local state
      setUsers(prev => prev.map(user => 
        user.id === id ? updatedUser : user
      ));
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      await usersApi.delete(id);
      
      // Remove from local state
      setUsers(prev => prev.filter(user => user.id !== id));
      setTotal(prev => prev - 1);
      
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const updatedUser = await usersApi.toggleStatus(id);
      
      // Update the local state
      setUsers(prev => prev.map(user => 
        user.id === id ? updatedUser : user
      ));
      
      toast({
        title: 'Success',
        description: `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`,
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user status';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (id: string, newPassword: string): Promise<boolean> => {
    try {
      setLoading(true);
      await usersApi.resetPassword(id, newPassword);
      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchUsers();
  };

  return {
    users,
    total,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetPassword,
    refresh,
  };
} 
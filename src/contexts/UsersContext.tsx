import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usersApi, type UserProfile } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';

interface UsersContextType {
  users: UserProfile[];
  activeUsers: UserProfile[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const { user } = useAuth();

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const fetchUsers = async (force = false) => {
    const now = Date.now();
    
    // Skip if we have recent data and not forcing refresh
    if (!force && users.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      return;
    }

    // Skip if not authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all users up to 100 (should be enough for most organizations)
      const response = await usersApi.getAll({}, 1, 100);
      setUsers(response.data);
      setLastFetch(now);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      console.error('Error fetching users:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when user is authenticated
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const refreshUsers = async () => {
    await fetchUsers(true);
  };

  const activeUsers = users.filter(u => u.is_active);

  const value: UsersContextType = {
    users,
    activeUsers,
    loading,
    error,
    refreshUsers,
  };

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
};

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsersContext must be used within a UsersProvider');
  }
  return context;
};
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Database } from '@/integrations/supabase/types';

export type UserProfile = Tables<'profiles'>;
export type UserRole = Database['public']['Enums']['user_role'];

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UsersFilter {
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

export interface PaginatedUsersResponse {
  data: UserProfile[];
  total: number;
  page: number;
  limit: number;
}

export class UsersAPI {
  async getAll(filters?: UsersFilter, page = 1, limit = 10): Promise<PaginatedUsersResponse> {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async getById(id: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async create(userData: CreateUserRequest): Promise<UserProfile> {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Then update the profile with additional data
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: userData.full_name,
        role: userData.role,
        email: userData.email,
        is_active: true,
      })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (error) {
      // If profile update fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(error.message);
    }

    return data;
  }

  async update(id: string, updates: UpdateUserRequest): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    // First deactivate the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    // Then delete the auth user (this will cascade to profile)
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      throw new Error(authError.message);
    }
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async toggleStatus(id: string): Promise<UserProfile> {
    // Get current status
    const user = await this.getById(id);
    
    // Toggle the status
    return this.update(id, { is_active: !user.is_active });
  }
}

export const usersApi = new UsersAPI(); 
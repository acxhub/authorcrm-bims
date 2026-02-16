import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import type { Tables, Database } from '@/integrations/supabase/types';

// Create admin client with service role key for user management.
// Set VITE_SUPABASE_SERVICE_ROLE_KEY in .env. Rotate key in Supabase if it was ever committed.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://rvxyycuukrkjlmaytqok.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? "";

const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || "placeholder", {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
  force_password_reset?: boolean;
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
    let query = adminClient
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
    const { data, error } = await adminClient
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
    // First create the auth user using admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Then update the profile with additional data using admin client
    const { data, error } = await adminClient
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
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return data;
  }

  async update(id: string, updates: UpdateUserRequest): Promise<UserProfile> {
    // Handle force password reset if specified
    if (updates.force_password_reset !== undefined) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        id,
        {
          user_metadata: { force_password_reset: updates.force_password_reset }
        }
      );

      if (authError) {
        throw new Error(`Failed to update user auth settings: ${authError.message}`);
      }

      // Remove from updates object as it's not a profile field
      delete updates.force_password_reset;
    }

    const { data, error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    // First deactivate the profile (use adminClient to bypass RLS)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);

    if (profileError) {
      throw new Error(`Failed to deactivate user: ${profileError.message}`);
    }

    // Then delete the auth user using admin client
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      throw new Error(`Failed to delete user: ${authError.message}`);
    }
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
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
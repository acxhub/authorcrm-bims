import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Tag = Tables<'tags'>;
export type CreateTagRequest = Omit<TablesInsert<'tags'>, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTagRequest = Partial<Omit<TablesUpdate<'tags'>, 'id' | 'created_at' | 'updated_at'>>;

// Predefined tags for the system
export const PREDEFINED_TAGS = [
  { name: 'Not In Service', color: '#EF4444', description: 'Phone number is not in service' },
  { name: 'Wrong Number', color: '#F97316', description: 'Incorrect phone number provided' },
  { name: 'Wrong Email', color: '#F59E0B', description: 'Incorrect email address provided' },
  { name: 'Not Interested', color: '#6B7280', description: 'Author is not interested in our services' },
  { name: 'Dead', color: '#374151', description: 'Lead is no longer viable' },
];

export class TagsAPI {
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }

    return data || [];
  }

  async getTagById(id: string): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch tag: ${error.message}`);
    }

    return data;
  }

  async createTag(tagData: CreateTagRequest): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .insert(tagData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create tag: ${error.message}`);
    }

    return data;
  }

  async updateTag(id: string, updates: UpdateTagRequest): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update tag: ${error.message}`);
    }

    return data;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('tags')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete tag: ${error.message}`);
    }
  }

  async deleteAllTags(): Promise<void> {
    const { error } = await supabase
      .from('tags')
      .update({ is_active: false })
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to delete all tags: ${error.message}`);
    }
  }

  async initializePredefinedTags(): Promise<Tag[]> {
    // First, get existing tags to avoid duplicates
    const existingTags = await this.getTags();
    const existingTagNames = existingTags.map(tag => tag.name);

    // Filter out tags that already exist
    const tagsToCreate = PREDEFINED_TAGS.filter(
      tag => !existingTagNames.includes(tag.name)
    );

    if (tagsToCreate.length === 0) {
      return existingTags;
    }

    // Create new tags
    const { data, error } = await supabase
      .from('tags')
      .insert(tagsToCreate.map(tag => ({
        ...tag,
        is_active: true
      })))
      .select('*');

    if (error) {
      throw new Error(`Failed to initialize predefined tags: ${error.message}`);
    }

    // Return all tags (existing + newly created)
    return await this.getTags();
  }

  async getTagStats(): Promise<{
    totalTags: number;
    activeTags: number;
    inactiveTags: number;
  }> {
    const { data: allTags, error: allError } = await supabase
      .from('tags')
      .select('is_active');

    if (allError) {
      throw new Error(`Failed to fetch tag stats: ${allError.message}`);
    }

    const totalTags = allTags?.length || 0;
    const activeTags = allTags?.filter(tag => tag.is_active).length || 0;
    const inactiveTags = totalTags - activeTags;

    return {
      totalTags,
      activeTags,
      inactiveTags,
    };
  }
}

export const tagsApi = new TagsAPI(); 
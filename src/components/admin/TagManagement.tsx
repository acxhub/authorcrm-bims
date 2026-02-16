import React, { useState } from 'react';
import { Hash, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useTags,
  useArchiveAllTags,
  useInitializePredefinedTags,
  useCreateTag,
  useUpdateTag,
  useArchiveTag,
  useTagStats
} from '@/hooks/useTags';
import { useAuth } from '@/hooks/useAuth';
import { PREDEFINED_TAGS } from '@/lib/api/tags';
import type { Tag, CreateTagRequest } from '@/lib/api/tags';

interface TagManagementProps {
  onTagsUpdated?: () => void;
}

export const TagManagement: React.FC<TagManagementProps> = ({ onTagsUpdated }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTagData, setNewTagData] = useState<CreateTagRequest>({
    name: '',
    color: '#6B7280',
    description: '',
    is_active: true,
  });

  const { user } = useAuth();
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: tagStats } = useTagStats();
  const archiveAllTags = useArchiveAllTags();
  const initializePredefinedTags = useInitializePredefinedTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const archiveTag = useArchiveTag();

  const handleDeleteAllTags = async () => {
    const confirmed = confirm(
      'Are you sure you want to archive ALL existing tags? They can be restored by an admin.'
    );
    
    if (confirmed) {
      try {
        await archiveAllTags.mutateAsync(user?.id || '');
        onTagsUpdated?.();
      } catch (error) {
        console.error('Failed to delete all tags:', error);
      }
    }
  };

  const handleInitializePredefinedTags = async () => {
    try {
      await initializePredefinedTags.mutateAsync();
      onTagsUpdated?.();
    } catch (error) {
      console.error('Failed to initialize predefined tags:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagData.name.trim()) return;

    try {
      await createTag.mutateAsync(newTagData);
      setNewTagData({
        name: '',
        color: '#6B7280',
        description: '',
        is_active: true,
      });
      setIsCreateDialogOpen(false);
      onTagsUpdated?.();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async (tag: Tag) => {
    try {
      await updateTag.mutateAsync({
        id: tag.id,
        data: {
          name: tag.name,
          color: tag.color,
          description: tag.description,
        }
      });
      setEditingTag(null);
      onTagsUpdated?.();
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    const confirmed = confirm('Archive this tag? It can be restored by an admin.');
    
    if (confirmed) {
      try {
        await archiveTag.mutateAsync({ id: tagId, deletedBy: user?.id || '' });
        onTagsUpdated?.();
      } catch (error) {
        console.error('Failed to delete tag:', error);
      }
    }
  };

  const isLoading = archiveAllTags.isPending || initializePredefinedTags.isPending ||
                   createTag.isPending || updateTag.isPending || archiveTag.isPending;

  const predefinedTagNames = PREDEFINED_TAGS.map(tag => tag.name);
  const existingTagNames = tags?.map(tag => tag.name) || [];
  const missingPredefinedTags = predefinedTagNames.filter(name => !existingTagNames.includes(name));
  const hasPredefinedTags = predefinedTagNames.every(name => existingTagNames.includes(name));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Hash className="h-6 w-6" />
            Tag Management
          </h2>
          <p className="text-gray-600">Manage system tags for lead categorization</p>
        </div>
      </div>

      {/* Stats Card */}
      {tagStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tag Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{tagStats.activeTags}</div>
                <div className="text-sm text-gray-500">Active Tags</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{tagStats.inactiveTags}</div>
                <div className="text-sm text-gray-500">Inactive Tags</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{PREDEFINED_TAGS.length}</div>
                <div className="text-sm text-gray-500">Predefined Tags</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Alerts */}
      <div className="space-y-3">
        {!hasPredefinedTags && missingPredefinedTags.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="flex items-center justify-between">
                <span>
                  Missing {missingPredefinedTags.length} predefined tag{missingPredefinedTags.length > 1 ? 's' : ''}: {missingPredefinedTags.join(', ')}
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleInitializePredefinedTags}
                  disabled={isLoading}
                  className="ml-4"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Missing Tags
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {hasPredefinedTags && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All predefined tags are available in the system.
            </AlertDescription>
          </Alert>
        )}

        {tags && tags.length === 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center justify-between">
                <span>No tags found. Initialize the predefined tags to get started.</span>
                <Button 
                  size="sm" 
                  onClick={handleInitializePredefinedTags}
                  disabled={isLoading}
                  className="ml-4"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Initialize Tags
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button 
          onClick={handleInitializePredefinedTags}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {hasPredefinedTags ? 'Refresh Predefined Tags' : 'Initialize Predefined Tags'}
        </Button>

        {tags && tags.length > 0 && (
          <Button 
            variant="outline"
            onClick={handleDeleteAllTags}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Archive All Tags
          </Button>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Tag Name *</Label>
                <Input
                  id="tag-name"
                  placeholder="Enter tag name"
                  value={newTagData.name}
                  onChange={(e) => setNewTagData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="tag-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tag-color"
                    type="color"
                    value={newTagData.color}
                    onChange={(e) => setNewTagData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10"
                  />
                  <Input
                    placeholder="#6B7280"
                    value={newTagData.color}
                    onChange={(e) => setNewTagData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tag-description">Description</Label>
                <Textarea
                  id="tag-description"
                  placeholder="Enter tag description (optional)"
                  value={newTagData.description || ''}
                  onChange={(e) => setNewTagData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTag}
                  disabled={!newTagData.name.trim() || isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Tag'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Tags ({tags?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {tagsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tags...</div>
          ) : tags?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tags found. Initialize predefined tags to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {tags?.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <div className="font-medium">{tag.name}</div>
                      {tag.description && (
                        <div className="text-sm text-gray-500">{tag.description}</div>
                      )}
                    </div>
                    <Badge 
                      variant="secondary"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: tag.color
                      }}
                    >
                      {tag.name}
                    </Badge>
                    {predefinedTagNames.includes(tag.name) && (
                      <Badge variant="outline" className="text-xs">
                        Predefined
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predefined Tags Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Predefined Tags Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-3">
              These are the standard tags that should be available in the system:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PREDEFINED_TAGS.map((tag, index) => (
                <div key={index} className="flex items-center gap-3 p-2 border rounded">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{tag.name}</div>
                    <div className="text-xs text-gray-500">{tag.description}</div>
                  </div>
                  {existingTagNames.includes(tag.name) ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
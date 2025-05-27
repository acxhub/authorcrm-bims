import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useManageLeadTags } from '@/hooks/useLeads';
import { PREDEFINED_TAGS } from '@/lib/api/tags';
import { useTags } from '@/hooks/useTags';
import type { Lead } from '@/lib/api/leads';
import type { Tag as TagType } from '@/lib/api/tags';

interface SimpleTagAddProps {
  lead: Lead;
  onTagsChange?: (tags: TagType[]) => void;
}

export const SimpleTagAdd: React.FC<SimpleTagAddProps> = ({ 
  lead, 
  onTagsChange 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { data: allTags } = useTags();
  const { addTags, removeTags } = useManageLeadTags();

  // Filter to only show predefined tags that exist in the system
  const predefinedTagNames = PREDEFINED_TAGS.map(tag => tag.name);
  const availablePredefinedTags = allTags?.filter(tag => 
    predefinedTagNames.includes(tag.name)
  ) || [];

  // Get current lead tags that are predefined
  const currentPredefinedTags = lead.tags?.filter(tag => 
    predefinedTagNames.includes(tag.name)
  ) || [];

  const handleAddTags = async () => {
    if (selectedTagIds.length === 0) return;

    try {
      await addTags.mutateAsync({ leadId: lead.id, tagIds: selectedTagIds });
      
      // Update local state
      const newTags = allTags?.filter(tag => selectedTagIds.includes(tag.id)) || [];
      const updatedTags = [...(lead.tags || []), ...newTags];
      onTagsChange?.(updatedTags);
      
      setIsDialogOpen(false);
      setSelectedTagIds([]);
    } catch (error) {
      console.error('Failed to add tags:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTags.mutateAsync({ leadId: lead.id, tagIds: [tagId] });
      
      // Update local state
      const updatedTags = lead.tags?.filter(tag => tag.id !== tagId) || [];
      onTagsChange?.(updatedTags);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      setSelectedTagIds(prev => [...prev, tagId]);
    } else {
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    }
  };

  const isLoading = addTags.isPending || removeTags.isPending;

  // Tags that can be added (not already on the lead)
  const currentTagIds = currentPredefinedTags.map(tag => tag.id);
  const availableToAdd = availablePredefinedTags.filter(tag => 
    !currentTagIds.includes(tag.id)
  );

  return (
    <div className="space-y-3">
      {/* Current Predefined Tags */}
      <div className="flex flex-wrap gap-2">
        {currentPredefinedTags.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No predefined tags applied</div>
        ) : (
          currentPredefinedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                borderColor: tag.color
              }}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                disabled={isLoading}
                className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Add Tags Button */}
      {availableToAdd.length > 0 && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Add Predefined Tags
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Predefined Tags</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Available Predefined Tags</Label>
                <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                  {availableToAdd.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      All predefined tags are already applied to this lead
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableToAdd.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={selectedTagIds.includes(tag.id)}
                            onCheckedChange={(checked) => 
                              handleTagToggle(tag.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="flex-1 flex items-center gap-2 cursor-pointer"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{tag.name}</div>
                              {tag.description && (
                                <div className="text-xs text-gray-500">
                                  {tag.description}
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {selectedTagIds.length > 0 && (
                <div>
                  <Label>Selected Tags ({selectedTagIds.length})</Label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedTagIds.map((tagId) => {
                      const tag = availableToAdd.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <Badge
                          key={tagId}
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: tag.color
                          }}
                        >
                          {tag.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedTagIds([]);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTags}
                  disabled={selectedTagIds.length === 0 || isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add Tags'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Info about predefined tags */}
      {availablePredefinedTags.length === 0 && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          No predefined tags found. Please initialize them in the Admin Panel.
        </div>
      )}
    </div>
  );
}; 
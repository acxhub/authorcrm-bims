import React, { useState } from 'react';
import { Hash, Plus, X, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useManageLeadTags } from '@/hooks/useLeads';
import { useTags } from '@/hooks/useTags';
import { PREDEFINED_TAGS } from '@/lib/api/tags';
import type { Lead } from '@/lib/api/leads';
import type { Tag as TagType } from '@/lib/api/tags';

interface LeadTaggingProps {
  lead: Lead;
  onTagsChange?: (tags: TagType[]) => void;
}

export const LeadTagging: React.FC<LeadTaggingProps> = ({ 
  lead, 
  onTagsChange 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allTags, isLoading: tagsLoading } = useTags();
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

  // Filter available tags based on search and current assignments
  const currentTagIds = currentPredefinedTags.map(tag => tag.id);
  const filteredAvailableTags = availablePredefinedTags.filter(tag =>
    !currentTagIds.includes(tag.id) &&
    (tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     tag.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddTags = async () => {
    if (selectedTagIds.length === 0) return;

    try {
      await addTags.mutateAsync({ leadId: lead.id, tagIds: selectedTagIds });
      
      // Update local state
      const newTags = allTags?.filter(tag => selectedTagIds.includes(tag.id)) || [];
      const updatedTags = [...(lead.tags || []), ...newTags];
      onTagsChange?.(updatedTags);
      
      setIsAddDialogOpen(false);
      setSelectedTagIds([]);
      setSearchTerm('');
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

  const handleBulkRemove = async () => {
    if (currentPredefinedTags.length === 0) return;

    const confirmed = confirm(`Remove all ${currentPredefinedTags.length} predefined tags from this lead?`);
    if (!confirmed) return;

    try {
      const tagIds = currentPredefinedTags.map(tag => tag.id);
      await removeTags.mutateAsync({ leadId: lead.id, tagIds });
      
      // Update local state - keep only non-predefined tags
      const updatedTags = lead.tags?.filter(tag => !predefinedTagNames.includes(tag.name)) || [];
      onTagsChange?.(updatedTags);
    } catch (error) {
      console.error('Failed to remove tags:', error);
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Predefined Tags Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Predefined Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Applied Predefined Tags ({currentPredefinedTags.length})</Label>
            {currentPredefinedTags.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRemove}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3 mr-1" />
                Remove All
              </Button>
            )}
          </div>
          
          {currentPredefinedTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <Hash className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No predefined tags applied</p>
              <p className="text-sm">Add tags to categorize this lead</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentPredefinedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1 text-sm"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: tag.color
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    disabled={isLoading}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Add Tags Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Available Predefined Tags</Label>
            {filteredAvailableTags.length > 0 && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Tags
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Predefined Tags</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Search */}
                    <div>
                      <Label htmlFor="tag-search">Search Tags</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="tag-search"
                          placeholder="Search predefined tags..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Available Tags */}
                    <div>
                      <Label>Select Tags to Add</Label>
                      <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                        {tagsLoading ? (
                          <div className="text-center py-4 text-sm text-gray-500">
                            Loading tags...
                          </div>
                        ) : filteredAvailableTags.length === 0 ? (
                          <div className="text-center py-4 text-sm text-gray-500">
                            {searchTerm ? 'No tags found matching your search' : 'All predefined tags are already applied'}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredAvailableTags.map((tag) => (
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
                            const tag = filteredAvailableTags.find(t => t.id === tagId);
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
                          setIsAddDialogOpen(false);
                          setSelectedTagIds([]);
                          setSearchTerm('');
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
          </div>

          {/* Quick Add Buttons for Available Tags */}
          {filteredAvailableTags.length === 0 ? (
            <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
              {availablePredefinedTags.length === 0 ? (
                <div>
                  <Hash className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No predefined tags found</p>
                  <p className="text-xs">Initialize them in the Admin Panel</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm">All predefined tags are already applied</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {filteredAvailableTags.slice(0, 5).map((tag) => (
                <Button
                  key={tag.id}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="justify-start h-auto p-2"
                  onClick={() => {
                    setSelectedTagIds([tag.id]);
                    handleAddTags();
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="text-left">
                    <div className="font-medium text-sm">{tag.name}</div>
                    {tag.description && (
                      <div className="text-xs text-gray-500">{tag.description}</div>
                    )}
                  </div>
                </Button>
              ))}
              {filteredAvailableTags.length > 5 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{filteredAvailableTags.length - 5} more available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Predefined Tags Reference */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium text-gray-600">Predefined Tags Reference</Label>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {PREDEFINED_TAGS.map((tag, index) => {
              const isAvailable = availablePredefinedTags.some(t => t.name === tag.name);
              const isApplied = currentPredefinedTags.some(t => t.name === tag.name);
              
              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className={isApplied ? 'font-medium' : ''}>{tag.name}</span>
                  <span className="text-gray-500">- {tag.description}</span>
                  {isApplied && <Badge variant="outline" className="text-xs">Applied</Badge>}
                  {!isAvailable && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Not Available</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 
import React, { useState } from 'react';
import { Tag, Eye, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TagDistribution } from '@/lib/api/leadManagerMetrics';
import { LeadsModal } from './LeadsModal';

interface TagDistributionSectionProps {
  tagDistribution: TagDistribution[];
  totalLeads: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export const TagDistributionSection: React.FC<TagDistributionSectionProps> = ({
  tagDistribution,
  totalLeads,
  isLoading,
  onRefresh,
}) => {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showNoTagsModal, setShowNoTagsModal] = useState(false);

  const selectedTag = tagDistribution.find(t => t.tagId === selectedTagId);
  
  // Get top 10 tags for chart
  const topTags = tagDistribution.slice(0, 10);
  const maxCount = topTags.length > 0 ? topTags[0].count : 0;

  // Calculate leads with tags vs without
  const leadsWithTags = tagDistribution.reduce((sum, t) => sum + t.count, 0);
  const uniqueLeadsWithTags = Math.min(leadsWithTags, totalLeads); // Approximate since leads can have multiple tags

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tag Distribution
              </CardTitle>
              <CardDescription>
                {tagDistribution.length} active tags across {totalLeads.toLocaleString()} leads
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowNoTagsModal(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Untagged
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tagDistribution.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-lg">No Tags Found</h3>
              <p className="text-muted-foreground">Create tags in the Admin Panel to categorize leads.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Visual Chart */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Top 10 Tags by Lead Count
                </h4>
                <div className="space-y-3">
                  {topTags.map((tag) => (
                    <div 
                      key={tag.tagId} 
                      className="cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                      onClick={() => setSelectedTagId(tag.tagId)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm font-medium">{tag.tagName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {tag.count.toLocaleString()} leads
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {totalLeads > 0 ? ((tag.count / totalLeads) * 100).toFixed(1) : 0}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={maxCount > 0 ? (tag.count / maxCount) * 100 : 0}
                        className="h-2"
                        style={{ 
                          // @ts-ignore - custom CSS variable
                          '--progress-background': tag.color 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Table */}
              <div>
                <h4 className="font-medium mb-3">All Tags</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead className="text-right">Lead Count</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tagDistribution.map((tag) => (
                        <TableRow 
                          key={tag.tagId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedTagId(tag.tagId)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="font-medium">{tag.tagName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {tag.count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant="outline"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                                borderColor: tag.color,
                              }}
                            >
                              {totalLeads > 0 ? ((tag.count / totalLeads) * 100).toFixed(1) : 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTagId(tag.tagId);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {tagDistribution.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Tags</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {tagDistribution.filter(t => t.count > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Tags in Use</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {tagDistribution.filter(t => t.count === 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Unused Tags</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads by Tag Modal */}
      <LeadsModal
        open={!!selectedTagId}
        onClose={() => setSelectedTagId(null)}
        title={`Leads with "${selectedTag?.tagName || 'Tag'}"`}
        description={`${selectedTag?.count || 0} leads with this tag`}
        filterType="by-tag"
        tagId={selectedTagId || undefined}
      />

      {/* Untagged Leads Modal */}
      <LeadsModal
        open={showNoTagsModal}
        onClose={() => setShowNoTagsModal(false)}
        title="Leads Without Tags"
        description="Leads that have no tags assigned"
        filterType="no-tags"
      />
    </>
  );
};

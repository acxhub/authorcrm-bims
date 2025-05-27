import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus, useCreateDefaultStatuses, useReorderStatuses } from '@/hooks/useStatuses';
import { Plus, Edit, Trash2, GripVertical, Settings, Loader2 } from 'lucide-react';
import type { Status } from '@/lib/api/statuses';

const statusFormSchema = z.object({
  name: z.string().min(1, 'Status name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format'),
  order_index: z.number().min(1, 'Order must be at least 1'),
});

type StatusFormData = z.infer<typeof statusFormSchema>;

interface StatusManagementProps {
  onStatusesUpdated?: () => void;
}

// Sortable Row Component
interface SortableStatusRowProps {
  status: Status;
  onEdit: (status: Status) => void;
  onDelete: (statusId: string) => void;
  isFormLoading: boolean;
  isDeleteLoading: boolean;
}

const SortableStatusRow: React.FC<SortableStatusRowProps> = ({
  status,
  onEdit,
  onDelete,
  isFormLoading,
  isDeleteLoading,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-gray-50' : ''}>
      <TableCell>
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{status.order_index}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {status.name}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" style={{ borderColor: status.color, color: status.color }}>
          {status.color}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={status.is_active ? "default" : "secondary"}>
          {status.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(status)}
            disabled={isFormLoading}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(status.id)}
            className="text-red-600 hover:text-red-700"
            disabled={isDeleteLoading}
          >
            {isDeleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const StatusManagement: React.FC<StatusManagementProps> = ({ onStatusesUpdated }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  
  const { data: statuses, isLoading, error, refetch } = useStatuses();
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();
  const createDefaultStatuses = useCreateDefaultStatuses();
  const reorderStatuses = useReorderStatuses();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<StatusFormData>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      name: '',
      color: '#6B7280',
      order_index: (statuses?.length || 0) + 1,
    },
  });

  const sortedStatuses = statuses?.slice().sort((a, b) => a.order_index - b.order_index) || [];

  const handleCreateStatus = () => {
    form.reset({
      name: '',
      color: '#6B7280',
      order_index: (statuses?.length || 0) + 1,
    });
    setEditingStatus(null);
    setIsCreateModalOpen(true);
  };

  const handleEditStatus = (status: Status) => {
    form.reset({
      name: status.name,
      color: status.color,
      order_index: status.order_index,
    });
    setEditingStatus(status);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (data: StatusFormData) => {
    try {
      if (editingStatus) {
        await updateStatus.mutateAsync({
          id: editingStatus.id,
          data: {
            name: data.name,
            color: data.color,
            order_index: data.order_index,
          },
        });
      } else {
        await createStatus.mutateAsync({
          name: data.name,
          color: data.color,
          order_index: data.order_index,
          is_active: true,
        });
      }
      
      setIsCreateModalOpen(false);
      setEditingStatus(null);
      onStatusesUpdated?.();
    } catch (error) {
      // Error handling is done in the hooks
      console.error('Failed to save status:', error);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteStatus.mutateAsync(statusId);
      onStatusesUpdated?.();
    } catch (error) {
      // Error handling is done in the hooks
      console.error('Failed to delete status:', error);
    }
  };

  const handleCreateDefaultStatuses = async () => {
    try {
      await createDefaultStatuses.mutateAsync();
      onStatusesUpdated?.();
    } catch (error) {
      // Error handling is done in the hooks
      console.error('Failed to create default statuses:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedStatuses.findIndex((status) => status.id === active.id);
      const newIndex = sortedStatuses.findIndex((status) => status.id === over?.id);

      const reorderedStatuses = arrayMove(sortedStatuses, oldIndex, newIndex);
      
      // Update order_index for all affected statuses
      const statusUpdates = reorderedStatuses.map((status, index) => ({
        id: status.id,
        order_index: index + 1,
      }));

      try {
        await reorderStatuses.mutateAsync(statusUpdates);
        onStatusesUpdated?.();
      } catch (error) {
        console.error('Failed to reorder statuses:', error);
      }
    }
  };

  const isFormLoading = createStatus.isPending || updateStatus.isPending;
  const isDeleteLoading = deleteStatus.isPending;
  const isDefaultStatusesLoading = createDefaultStatuses.isPending;
  const isReorderLoading = reorderStatuses.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading statuses...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading statuses: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Pipeline Status Management
              </CardTitle>
              <CardDescription>
                Configure the statuses for your sales pipeline. Leads will move through these stages.
              </CardDescription>
            </div>
            <Button onClick={handleCreateStatus} disabled={isFormLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {!statuses?.length ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pipeline Statuses</h3>
                <p className="text-gray-600 mb-6">
                  You need to set up pipeline statuses before you can manage leads. 
                  Start with our recommended default statuses or create your own.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={handleCreateDefaultStatuses} 
                  variant="default"
                  disabled={isDefaultStatusesLoading}
                >
                  {isDefaultStatusesLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Default Statuses'
                  )}
                </Button>
                <Button onClick={handleCreateStatus} variant="outline" disabled={isFormLoading}>
                  Create Custom Status
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {isReorderLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating status order...</span>
                  </div>
                ) : (
                  'Drag and drop to reorder statuses. The order determines how they appear in the pipeline.'
                )}
              </div>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status Name</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={sortedStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {sortedStatuses.map((status) => (
                        <SortableStatusRow
                          key={status.id}
                          status={status}
                          onEdit={handleEditStatus}
                          onDelete={handleDeleteStatus}
                          isFormLoading={isFormLoading}
                          isDeleteLoading={isDeleteLoading}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Status Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? 'Edit Status' : 'Create New Status'}
            </DialogTitle>
            <DialogDescription>
              {editingStatus 
                ? 'Update the status details below.'
                : 'Add a new status to your pipeline. Choose a descriptive name and color.'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., New Lead, Contacted, Qualified" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          className="w-16 h-10 p-1 border rounded"
                          {...field} 
                        />
                        <Input 
                          placeholder="#6B7280" 
                          className="flex-1"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Position</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isFormLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isFormLoading}>
                  {isFormLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingStatus ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingStatus ? 'Update Status' : 'Create Status'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 
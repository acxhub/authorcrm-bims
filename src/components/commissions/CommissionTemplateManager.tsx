import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Star, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  useCommissionTemplates,
  useCreateCommissionTemplate,
  useUpdateCommissionTemplate,
  useDeleteCommissionTemplate,
  useSetDefaultCommissionTemplate,
  useCreateCommissionTier,
  useUpdateCommissionTier,
  useArchiveCommissionTier,
} from '@/hooks/useCommissionTemplates';
import { useAuth } from '@/hooks/useAuth';
import type { CommissionTemplateWithTiers, CommissionTier } from '@/lib/api/commission-templates';

interface TemplateFormData {
  name: string;
  description: string;
  calculation_type: 'graduated' | 'flat_rate';
  markup_commissionable_percent: number;
  is_default: boolean;
}

interface TierFormData {
  min_amount: string;
  max_amount: string;
  commission_percent: string;
  sort_order: string;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'No Limit';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatPercent = (percent: number | null | undefined): string => {
  if (percent === null || percent === undefined) return '0%';
  return `${percent}%`;
};

export const CommissionTemplateManager: React.FC = () => {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommissionTemplateWithTiers | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [newTierTemplateId, setNewTierTemplateId] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<{ tier: CommissionTier; templateId: string } | null>(null);

  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: '',
    description: '',
    calculation_type: 'graduated',
    markup_commissionable_percent: 0,
    is_default: false,
  });

  const [tierForm, setTierForm] = useState<TierFormData>({
    min_amount: '',
    max_amount: '',
    commission_percent: '',
    sort_order: '1',
  });

  const { data: templates, isLoading } = useCommissionTemplates();
  const createTemplate = useCreateCommissionTemplate();
  const updateTemplate = useUpdateCommissionTemplate();
  const deleteTemplate = useDeleteCommissionTemplate();
  const setDefaultTemplate = useSetDefaultCommissionTemplate();
  const createTier = useCreateCommissionTier();
  const updateTier = useUpdateCommissionTier();
  const archiveTier = useArchiveCommissionTier();

  const toggleExpanded = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      calculation_type: 'graduated',
      markup_commissionable_percent: 0,
      is_default: false,
    });
    setIsCreateOpen(true);
  };

  const handleEditTemplate = (template: CommissionTemplateWithTiers) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      calculation_type: template.calculation_type as 'graduated' | 'flat_rate',
      markup_commissionable_percent: template.markup_commissionable_percent || 0,
      is_default: template.is_default || false,
    });
    setIsCreateOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) return;

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          data: {
            name: templateForm.name,
            description: templateForm.description || null,
            calculation_type: templateForm.calculation_type,
            markup_commissionable_percent: templateForm.markup_commissionable_percent,
            is_default: templateForm.is_default,
          },
        });
      } else {
        await createTemplate.mutateAsync({
          name: templateForm.name,
          description: templateForm.description || null,
          calculation_type: templateForm.calculation_type,
          markup_commissionable_percent: templateForm.markup_commissionable_percent,
          is_default: templateForm.is_default,
          is_active: true,
          created_by: user?.id || null,
        });
      }
      setIsCreateOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this commission template?')) {
      return;
    }

    try {
      await deleteTemplate.mutateAsync(templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await setDefaultTemplate.mutateAsync(templateId);
    } catch (error) {
      console.error('Failed to set default template:', error);
    }
  };

  const handleAddTier = (templateId: string) => {
    setNewTierTemplateId(templateId);
    setEditingTier(null);
    setTierForm({
      min_amount: '',
      max_amount: '',
      commission_percent: '',
      sort_order: '1',
    });
  };

  const handleEditTier = (tier: CommissionTier, templateId: string) => {
    setEditingTier({ tier, templateId });
    setNewTierTemplateId(null);
    setTierForm({
      min_amount: tier.min_amount.toString(),
      max_amount: tier.max_amount?.toString() || '',
      commission_percent: tier.commission_percent.toString(),
      sort_order: (tier.sort_order || 0).toString(),
    });
  };

  const handleSaveTier = async (templateId: string) => {
    if (!tierForm.min_amount || !tierForm.commission_percent) return;

    try {
      if (editingTier) {
        await updateTier.mutateAsync({
          id: editingTier.tier.id,
          data: {
            min_amount: parseFloat(tierForm.min_amount),
            max_amount: tierForm.max_amount ? parseFloat(tierForm.max_amount) : null,
            commission_percent: parseFloat(tierForm.commission_percent),
            sort_order: parseInt(tierForm.sort_order) || 0,
          },
        });
        setEditingTier(null);
      } else {
        await createTier.mutateAsync({
          template_id: templateId,
          min_amount: parseFloat(tierForm.min_amount),
          max_amount: tierForm.max_amount ? parseFloat(tierForm.max_amount) : null,
          commission_percent: parseFloat(tierForm.commission_percent),
          sort_order: parseInt(tierForm.sort_order) || 0,
        });
        setNewTierTemplateId(null);
      }
      setTierForm({
        min_amount: '',
        max_amount: '',
        commission_percent: '',
        sort_order: '1',
      });
    } catch (error) {
      console.error('Failed to save tier:', error);
    }
  };

  const handleArchiveTier = async (tierId: string) => {
    if (!confirm('Archive this commission tier? It can be restored by an admin.')) {
      return;
    }

    try {
      await archiveTier.mutateAsync({ id: tierId, deletedBy: user?.id || '' });
    } catch (error) {
      console.error('Failed to archive tier:', error);
    }
  };

  const cancelTierForm = () => {
    setNewTierTemplateId(null);
    setEditingTier(null);
    setTierForm({
      min_amount: '',
      max_amount: '',
      commission_percent: '',
      sort_order: '1',
    });
  };

  const isLoading_ =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    deleteTemplate.isPending ||
    setDefaultTemplate.isPending ||
    createTier.isPending ||
    updateTier.isPending ||
    archiveTier.isPending;

  if (isLoading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading commission templates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Commission Template Management
          </h2>
          <p className="text-gray-600">Manage commission templates and tier structures</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard Commission"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Enter template description (optional)"
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="calculation-type">Calculation Type *</Label>
                <Select
                  value={templateForm.calculation_type}
                  onValueChange={(value: 'graduated' | 'flat_rate') =>
                    setTemplateForm((prev) => ({ ...prev, calculation_type: value }))
                  }
                >
                  <SelectTrigger id="calculation-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="flat_rate">Flat Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="markup-percent">Markup Commissionable Percent</Label>
                <Input
                  id="markup-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={templateForm.markup_commissionable_percent}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      markup_commissionable_percent: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-default"
                  checked={templateForm.is_default}
                  onCheckedChange={(checked) =>
                    setTemplateForm((prev) => ({ ...prev, is_default: checked }))
                  }
                />
                <Label htmlFor="is-default">Set as default template</Label>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isLoading_}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateForm.name.trim() || isLoading_}
                >
                  {isLoading_ ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates && templates.length === 0 ? (
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              No commission templates found. Create your first template to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates?.map((template) => {
            const isExpanded = expandedTemplates.has(template.id);
            const isAddingTier = newTierTemplateId === template.id;

            return (
              <Card key={template.id} className="bg-white/60 backdrop-blur-sm border-gray-200/60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.calculation_type === 'graduated' ? (
                          <Badge className="bg-blue-100 text-blue-700">Graduated</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">Flat Rate</Badge>
                        )}
                        {template.is_default && (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          Markup: {formatPercent(template.markup_commissionable_percent)}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                          disabled={isLoading_}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(template.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        disabled={isLoading_}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={isLoading_}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <Separator className="mb-4" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Commission Tiers</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTier(template.id)}
                          disabled={isLoading_ || isAddingTier}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Tier
                        </Button>
                      </div>

                      {template.commission_tiers.length === 0 && !isAddingTier ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No tiers defined. Add a tier to configure commission rates.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Min Amount</TableHead>
                              <TableHead>Max Amount</TableHead>
                              <TableHead>Commission %</TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {template.commission_tiers.map((tier) => {
                              const isEditingThisTier = editingTier?.tier.id === tier.id;

                              if (isEditingThisTier) {
                                return (
                                  <TableRow key={tier.id}>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        value={tierForm.min_amount}
                                        onChange={(e) =>
                                          setTierForm((prev) => ({
                                            ...prev,
                                            min_amount: e.target.value,
                                          }))
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        placeholder="No limit"
                                        value={tierForm.max_amount}
                                        onChange={(e) =>
                                          setTierForm((prev) => ({
                                            ...prev,
                                            max_amount: e.target.value,
                                          }))
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        value={tierForm.commission_percent}
                                        onChange={(e) =>
                                          setTierForm((prev) => ({
                                            ...prev,
                                            commission_percent: e.target.value,
                                          }))
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        placeholder="1"
                                        value={tierForm.sort_order}
                                        onChange={(e) =>
                                          setTierForm((prev) => ({
                                            ...prev,
                                            sort_order: e.target.value,
                                          }))
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleSaveTier(template.id)}
                                          disabled={isLoading_}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={cancelTierForm}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              return (
                                <TableRow key={tier.id} className="hover:bg-gray-50">
                                  <TableCell>{formatCurrency(tier.min_amount)}</TableCell>
                                  <TableCell>{formatCurrency(tier.max_amount)}</TableCell>
                                  <TableCell>{formatPercent(tier.commission_percent)}</TableCell>
                                  <TableCell>{tier.sort_order || 0}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditTier(tier, template.id)}
                                        disabled={isLoading_}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleArchiveTier(tier.id)}
                                        disabled={isLoading_}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}

                            {isAddingTier && (
                              <TableRow>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={tierForm.min_amount}
                                    onChange={(e) =>
                                      setTierForm((prev) => ({
                                        ...prev,
                                        min_amount: e.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="No limit"
                                    value={tierForm.max_amount}
                                    onChange={(e) =>
                                      setTierForm((prev) => ({
                                        ...prev,
                                        max_amount: e.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={tierForm.commission_percent}
                                    onChange={(e) =>
                                      setTierForm((prev) => ({
                                        ...prev,
                                        commission_percent: e.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="1"
                                    value={tierForm.sort_order}
                                    onChange={(e) =>
                                      setTierForm((prev) => ({
                                        ...prev,
                                        sort_order: e.target.value,
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSaveTier(template.id)}
                                      disabled={isLoading_}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelTierForm}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Pencil, UserCircle } from 'lucide-react';
import { useAllAgentCommissionSettings, useUpsertAgentCommissionSettings } from '@/hooks/useCommissions';
import { useCommissionTemplates } from '@/hooks/useCommissionTemplates';
import { useUsersContext } from '@/contexts/UsersContext';

export const AgentCommissionSettings: React.FC = () => {
  const { activeUsers } = useUsersContext();
  const { data: allSettings, isLoading: settingsLoading } = useAllAgentCommissionSettings();
  const { data: templates } = useCommissionTemplates();
  const upsertSettings = useUpsertAgentCommissionSettings();

  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    template_id: '' as string | null,
    use_custom_override: false,
    custom_commission_percent: '',
    custom_markup_percent: '',
    notes: '',
  });

  const settingsMap = React.useMemo(() => {
    const map: Record<string, typeof allSettings extends (infer T)[] ? T : never> = {};
    allSettings?.forEach(s => {
      map[s.agent_id] = s;
    });
    return map;
  }, [allSettings]);

  const salesUsers = activeUsers.filter(u =>
    u.role === 'sales' || u.role === 'sales_manager'
  );

  const handleEdit = (agentId: string) => {
    const existing = settingsMap[agentId];
    setFormData({
      template_id: existing?.template_id || null,
      use_custom_override: existing?.use_custom_override || false,
      custom_commission_percent: existing?.custom_commission_percent?.toString() || '',
      custom_markup_percent: existing?.custom_markup_percent?.toString() || '',
      notes: existing?.notes || '',
    });
    setEditingAgentId(agentId);
  };

  const handleSave = async () => {
    if (!editingAgentId) return;

    await upsertSettings.mutateAsync({
      agentId: editingAgentId,
      settings: {
        template_id: formData.template_id || null,
        use_custom_override: formData.use_custom_override,
        custom_commission_percent: formData.custom_commission_percent
          ? parseFloat(formData.custom_commission_percent)
          : null,
        custom_markup_percent: formData.custom_markup_percent
          ? parseFloat(formData.custom_markup_percent)
          : null,
        notes: formData.notes || null,
      },
    });

    setEditingAgentId(null);
  };

  const editingUser = editingAgentId
    ? activeUsers.find(u => u.id === editingAgentId)
    : null;

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Agent Commission Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : salesUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sales agents found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Custom Override</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Markup %</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesUsers.map(user => {
                  const settings = settingsMap[user.id];
                  const templateName = settings?.template_id
                    ? templates?.find(t => t.id === settings.template_id)?.name
                    : null;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{user.full_name || user.email}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {templateName ? (
                          <Badge className="bg-blue-100 text-blue-700">{templateName}</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {settings?.use_custom_override ? (
                          <Badge className="bg-orange-100 text-orange-700">Yes</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {settings?.custom_commission_percent != null
                          ? `${settings.custom_commission_percent}%`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {settings?.custom_markup_percent != null
                          ? `${settings.custom_markup_percent}%`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAgentId} onOpenChange={(open) => !open && setEditingAgentId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Commission Settings: {editingUser?.full_name || editingUser?.email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Assignment</Label>
              <Select
                value={formData.template_id || 'none'}
                onValueChange={(val) =>
                  setFormData(prev => ({ ...prev, template_id: val === 'none' ? null : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {templates?.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.calculation_type})
                      {t.is_default ? ' (Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Enable Custom Overrides</Label>
                <p className="text-xs text-gray-500">Overrides template tiers with flat percentages</p>
              </div>
              <Switch
                checked={formData.use_custom_override}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, use_custom_override: checked }))
                }
              />
            </div>

            {formData.use_custom_override && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="custom-commission">Custom Commission %</Label>
                  <Input
                    id="custom-commission"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.custom_commission_percent}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, custom_commission_percent: e.target.value }))
                    }
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-gray-500">Overrides template tiers</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-markup">Custom Markup %</Label>
                  <Input
                    id="custom-markup"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.custom_markup_percent}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, custom_markup_percent: e.target.value }))
                    }
                    placeholder="Default: 50"
                  />
                  <p className="text-xs text-gray-500">% of markup that's commissionable</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="settings-notes">Notes</Label>
              <Textarea
                id="settings-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this agent's commission setup..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAgentId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={upsertSettings.isPending}>
              {upsertSettings.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

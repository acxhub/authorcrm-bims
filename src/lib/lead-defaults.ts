import type { Tables } from '@/integrations/supabase/types';

type StatusLite = Pick<Tables<'statuses'>, 'id' | 'name' | 'order_index'>;

/** New leads start in pipeline status "Unassigned" when that status exists. */
export function resolveUnassignedPipelineStatusId(statuses: StatusLite[]): string | undefined {
  const byName = statuses.find((s) => s.name.trim().toLowerCase() === 'unassigned');
  if (byName) return byName.id;
  const sorted = [...statuses].sort((a, b) => a.order_index - b.order_index);
  return sorted[0]?.id;
}

export const LEAD_RECORD_TYPES = ['lead', 'sold_lead'] as const;
export type LeadRecordType = (typeof LEAD_RECORD_TYPES)[number];

export const LEAD_RECORD_TYPE_LABELS: Record<LeadRecordType, string> = {
  lead: 'Lead',
  sold_lead: 'Sold Lead',
};

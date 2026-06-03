import { useQuery } from '@tanstack/react-query';
import { leadsApi, type LeadStats } from '@/lib/api/leads';

/**
 * Server-side aggregated lead metrics (totals, status breakdown, recent activity).
 * Pass `assignedTo` to scope to a single user's leads (e.g. sales agent dashboards).
 */
export const useLeadStats = (assignedTo?: string | null) => {
  return useQuery<LeadStats>({
    queryKey: ['lead-stats', assignedTo ?? 'all'],
    queryFn: () => leadsApi.getLeadStats(assignedTo),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/** Per-creator lead counts, optionally within a created_at window. */
export const useLeadCountsByCreator = (dateFrom?: string | null, dateTo?: string | null) => {
  return useQuery<Record<string, number>>({
    queryKey: ['lead-counts-by-creator', dateFrom ?? null, dateTo ?? null],
    queryFn: () => leadsApi.getLeadCountsByCreator(dateFrom, dateTo),
    staleTime: 5 * 60 * 1000,
  });
};

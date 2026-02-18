import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadManagerMetricsApi, LeadManagerMetrics } from '@/lib/api/leadManagerMetrics';
import { useToast } from '@/hooks/use-toast';

export function useLeadManagerMetrics(staleDays: number = 60) {
  return useQuery<LeadManagerMetrics>({
    queryKey: ['lead-manager-metrics', staleDays],
    queryFn: () => leadManagerMetricsApi.getMetrics(staleDays),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useNeverTouchedLeads(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'never-touched', page, limit],
    queryFn: () => leadManagerMetricsApi.getNeverTouchedLeads(page, limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useWentColdLeads(staleDays: number = 60, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'went-cold', staleDays, page, limit],
    queryFn: () => leadManagerMetricsApi.getWentColdLeads(staleDays, page, limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrphanedLeads(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'orphaned', page, limit],
    queryFn: () => leadManagerMetricsApi.getOrphanedLeads(page, limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnassignedLeadsManager(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'unassigned', page, limit],
    queryFn: () => leadManagerMetricsApi.getUnassignedLeads(page, limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useLeadsByAgent(userId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'by-agent', userId, page, limit],
    queryFn: () => leadManagerMetricsApi.getLeadsByAgent(userId, page, limit),
    staleTime: 2 * 60 * 1000,
    enabled: !!userId,
  });
}

export function useLeadsByTag(tagId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'by-tag', tagId, page, limit],
    queryFn: () => leadManagerMetricsApi.getLeadsByTag(tagId, page, limit),
    staleTime: 2 * 60 * 1000,
    enabled: !!tagId,
  });
}

export function useLeadsWithoutTags(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['lead-manager', 'without-tags', page, limit],
    queryFn: () => leadManagerMetricsApi.getLeadsWithoutTags(page, limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAutoAssignLeads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (leadIds: string[]) => leadManagerMetricsApi.autoAssignLeads(leadIds),
    onSuccess: (result) => {
      toast({
        title: 'Leads Auto-Assigned',
        description: `Successfully assigned ${result.assignments.length} leads to agents.`,
      });
      queryClient.invalidateQueries({ queryKey: ['lead-manager'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Auto-Assign Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

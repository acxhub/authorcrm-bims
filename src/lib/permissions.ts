import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function canPermanentlyDelete(
  profile: Profile | null,
  deletedAt: string | null
): boolean {
  if (!profile || profile.role !== 'leads_manager') return false;
  if (!deletedAt) return false;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(deletedAt) < thirtyDaysAgo;
}

export function canRestore(profile: Profile | null): boolean {
  return profile?.role === 'leads_manager';
}

export function canArchive(profile: Profile | null): boolean {
  if (!profile) return false;
  return ['leads_manager', 'sales_manager'].includes(profile.role || '');
}

/** Recycle (unassign) via RPC: managers any lead; sales only leads assigned to them. */
export function canRecycleLead(
  profile: Profile | null,
  leadAssignedTo: string | null | undefined,
  userId: string | undefined
): boolean {
  if (!profile || !userId) return false;
  if (profile.role === 'leads_manager' || profile.role === 'sales_manager' || profile.role === 'lead_miner') return true;
  if (profile.role === 'sales') return leadAssignedTo === userId;
  return false;
}

/** True if user may bulk-recycle at least one of the selected leads (assigned + role rules). */
export function canBulkRecycleSomeSelected(
  profile: Profile | null,
  selectedLeads: { assigned_to?: string | null }[],
  userId: string | undefined
): boolean {
  if (!selectedLeads.length || !userId) return false;
  return selectedLeads.some((lead) =>
    lead.assigned_to && canRecycleLead(profile, lead.assigned_to, userId)
  );
}

export function daysUntilPermanentDelete(deletedAt: string | null): number | null {
  if (!deletedAt) return null;
  const deletedDate = new Date(deletedAt);
  const eligibleDate = new Date(deletedDate);
  eligibleDate.setDate(eligibleDate.getDate() + 30);
  const now = new Date();
  const diffMs = eligibleDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

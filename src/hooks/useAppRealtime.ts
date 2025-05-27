import { useLeadsRealtime } from './useLeadsRealtime';
import { useTagsRealtime } from './useTagsRealtime';
import { useStatusesRealtime } from './useStatusesRealtime';
import { useActivitiesRealtime } from './useActivitiesRealtime';
import { useCommentsRealtime } from './useCommentsRealtime';
import { useDealsRealtime } from './useDealsRealtime';

/**
 * Comprehensive realtime hook that enables live updates for all major entities
 * Use this in your main app layout to enable realtime across the entire application
 */
export function useAppRealtime() {
  useLeadsRealtime();
  useTagsRealtime();
  useStatusesRealtime();
  useActivitiesRealtime();
  useCommentsRealtime();
  useDealsRealtime();
} 
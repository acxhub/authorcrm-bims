import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface LeadsStateFilters {
  search?: string;
  statusFilter?: string;
  assignedToFilter?: string;
  assignmentStatusFilter?: 'all' | 'assigned' | 'unassigned';
  dateFromFilter?: string;
  dateToFilter?: string;
  tagFilter?: string[];
}

export interface LeadsStateConfig {
  page: number;
  pageSize: number;
  filters: LeadsStateFilters;
  scrollPosition: number;
}

const STORAGE_KEY = 'leads-list-state';
const DEFAULT_STATE: LeadsStateConfig = {
  page: 1,
  pageSize: 10,
  filters: {
    search: '',
    statusFilter: '',
    assignedToFilter: '',
    assignmentStatusFilter: 'all',
    dateFromFilter: '',
    dateToFilter: '',
    tagFilter: [],
  },
  scrollPosition: 0,
};

export const useLeadsState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<LeadsStateConfig>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from sessionStorage and URL on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    let initialState = DEFAULT_STATE;

    if (savedState) {
      try {
        initialState = { ...DEFAULT_STATE, ...JSON.parse(savedState) };
      } catch (error) {
        console.warn('Failed to parse saved leads state:', error);
      }
    }

    // Override with URL params if they exist
    const urlParams = Object.fromEntries(searchParams.entries());
    if (Object.keys(urlParams).length > 0) {
      initialState = {
        ...initialState,
        page: parseInt(urlParams.page) || initialState.page,
        pageSize: parseInt(urlParams.pageSize) || initialState.pageSize,
        filters: {
          ...initialState.filters,
          search: urlParams.search || initialState.filters.search,
          statusFilter: urlParams.status || initialState.filters.statusFilter,
          assignedToFilter: urlParams.assignedTo || initialState.filters.assignedToFilter,
          assignmentStatusFilter: (urlParams.assignmentStatus as any) || initialState.filters.assignmentStatusFilter,
          dateFromFilter: urlParams.dateFrom || initialState.filters.dateFromFilter,
          dateToFilter: urlParams.dateTo || initialState.filters.dateToFilter,
          tagFilter: urlParams.tags ? urlParams.tags.split(',') : initialState.filters.tagFilter,
        },
      };
    }

    setState(initialState);
    setIsLoaded(true);
  }, [searchParams]);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Update URL params whenever filters change
  useEffect(() => {
    if (isLoaded) {
      const params = new URLSearchParams();
      
      if (state.page > 1) params.set('page', state.page.toString());
      if (state.pageSize !== 10) params.set('pageSize', state.pageSize.toString());
      if (state.filters.search) params.set('search', state.filters.search);
      if (state.filters.statusFilter) params.set('status', state.filters.statusFilter);
      if (state.filters.assignedToFilter) params.set('assignedTo', state.filters.assignedToFilter);
      if (state.filters.assignmentStatusFilter !== 'all') params.set('assignmentStatus', state.filters.assignmentStatusFilter);
      if (state.filters.dateFromFilter) params.set('dateFrom', state.filters.dateFromFilter);
      if (state.filters.dateToFilter) params.set('dateTo', state.filters.dateToFilter);
      if (state.filters.tagFilter && state.filters.tagFilter.length > 0) {
        params.set('tags', state.filters.tagFilter.join(','));
      }

      setSearchParams(params, { replace: true });
    }
  }, [state.filters, state.page, state.pageSize, isLoaded, setSearchParams]);

  const updateFilters = useCallback((updates: Partial<LeadsStateFilters>) => {
    setState(prev => ({
      ...prev,
      page: 1, // Reset to first page when filters change
      filters: { ...prev.filters, ...updates },
    }));
  }, []);

  const updatePage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const updatePageSize = useCallback((pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const updateScrollPosition = useCallback((scrollPosition: number) => {
    setState(prev => ({ ...prev, scrollPosition }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      page: 1,
      filters: DEFAULT_STATE.filters,
    }));
  }, []);

  const preserveScrollPosition = useCallback(() => {
    setTimeout(() => {
      if (state.scrollPosition > 0) {
        window.scrollTo({ top: state.scrollPosition, behavior: 'smooth' });
      }
    }, 100);
  }, [state.scrollPosition]);

  return {
    state,
    isLoaded,
    updateFilters,
    updatePage,
    updatePageSize,
    updateScrollPosition,
    resetFilters,
    preserveScrollPosition,
  };
}; 
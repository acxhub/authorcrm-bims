import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionTemplatesApi } from '@/lib/api/commission-templates';
import type {
  CreateCommissionTemplateData,
  UpdateCommissionTemplateData,
  CreateCommissionTierData,
  UpdateCommissionTierData,
} from '@/lib/api/commission-templates';
import { toast } from '@/hooks/use-toast';

export const useCommissionTemplates = () => {
  return useQuery({
    queryKey: ['commission-templates'],
    queryFn: () => commissionTemplatesApi.getTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes - low frequency
  });
};

export const useCommissionTemplate = (id: string) => {
  return useQuery({
    queryKey: ['commission-template', id],
    queryFn: () => commissionTemplatesApi.getTemplateById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateCommissionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommissionTemplateData) =>
      commissionTemplatesApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      toast({
        title: 'Template created',
        description: 'Commission template has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCommissionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommissionTemplateData }) =>
      commissionTemplatesApi.updateTemplate(id, data),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      queryClient.setQueryData(['commission-template', updatedTemplate.id], updatedTemplate);
      toast({
        title: 'Template updated',
        description: 'Commission template has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteCommissionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => commissionTemplatesApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      toast({
        title: 'Template deleted',
        description: 'Commission template has been deactivated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSetDefaultCommissionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => commissionTemplatesApi.setDefaultTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      toast({
        title: 'Default template set',
        description: 'The default commission template has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error setting default template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Tier mutations
export const useCreateCommissionTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommissionTierData) =>
      commissionTemplatesApi.createTier(data),
    onSuccess: (newTier) => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      queryClient.invalidateQueries({ queryKey: ['commission-template', newTier.template_id] });
      toast({
        title: 'Tier added',
        description: 'Commission tier has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding tier',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCommissionTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommissionTierData }) =>
      commissionTemplatesApi.updateTier(id, data),
    onSuccess: (updatedTier) => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      queryClient.invalidateQueries({ queryKey: ['commission-template', updatedTier.template_id] });
      toast({
        title: 'Tier updated',
        description: 'Commission tier has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating tier',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useArchiveCommissionTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      commissionTemplatesApi.archiveTier(id, deletedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      queryClient.invalidateQueries({ queryKey: ['archived-commission-tiers'] });
      toast({
        title: 'Tier archived',
        description: 'Commission tier has been archived.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error archiving tier', description: error.message, variant: 'destructive' });
    },
  });
};

export const useRestoreCommissionTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => commissionTemplatesApi.restoreTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      queryClient.invalidateQueries({ queryKey: ['archived-commission-tiers'] });
      toast({
        title: 'Tier restored',
        description: 'Commission tier has been restored.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring tier', description: error.message, variant: 'destructive' });
    },
  });
};

export const usePermanentlyDeleteCommissionTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => commissionTemplatesApi.permanentlyDeleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-templates'] });
      queryClient.invalidateQueries({ queryKey: ['archived-commission-tiers'] });
      toast({
        title: 'Tier permanently deleted',
        description: 'Commission tier has been permanently removed.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting tier', description: error.message, variant: 'destructive' });
    },
  });
};

export const useArchivedCommissionTiers = () => {
  return useQuery({
    queryKey: ['archived-commission-tiers'],
    queryFn: () => commissionTemplatesApi.getArchivedTiers(),
    staleTime: 10 * 60 * 1000,
  });
};

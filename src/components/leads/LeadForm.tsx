import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useStatuses } from '@/hooks/useStatuses';
import { useAuth } from '@/hooks/useAuth';
import type { CreateLeadData, UpdateLeadData } from '@/lib/api/leads';
import { DEFAULT_BOOK_TITLE_DISPLAY } from '@/lib/lead-display';
import {
  LEAD_RECORD_TYPE_LABELS,
  LEAD_RECORD_TYPES,
  type LeadRecordType,
  resolveUnassignedPipelineStatusId,
} from '@/lib/lead-defaults';
import { useToast } from '@/hooks/use-toast';

function buildLeadFormSchema(mode: 'create' | 'edit') {
  return z
    .object({
      book_title: z.string().optional().or(z.literal('')),
      first_name: z.string().min(1, 'First name is required'),
      last_name: z.string().min(1, 'Last name is required'),
      amazon_link: z.string().url('Invalid URL format').optional().or(z.literal('')),
      phone_number_1: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
      phone_number_2: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
      alternative_phone_number: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
      primary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
      secondary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
      author_bio: z.string().optional(),
      multiple_titles: z.boolean().default(false),
      other_titles: z.array(z.string()).optional(),
      lead_record_type: z.enum(['lead', 'sold_lead']),
      status_id: z.string().optional(),
      publisher: z.string().optional(),
      website: z.string().url('Invalid URL format').optional().or(z.literal('')),
      state: z.string().optional(),
      country: z.string().optional(),
      pen_name: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (mode === 'edit' && !data.status_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pipeline status is required',
          path: ['status_id'],
        });
      }
    });
}

type LeadFormData = z.infer<ReturnType<typeof buildLeadFormSchema>>;

interface LeadFormProps {
  mode?: 'create' | 'edit';
  onSubmit: (data: CreateLeadData | UpdateLeadData) => void;
  isLoading?: boolean;
  initialData?: Partial<
    LeadFormData & { author_name?: string; pen_name?: string | null; lead_record_type?: string }
  >;
}

export const LeadForm: React.FC<LeadFormProps> = ({
  mode = 'create',
  onSubmit,
  isLoading = false,
  initialData,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: statuses = [] } = useStatuses();
  const schema = React.useMemo(() => buildLeadFormSchema(mode), [mode]);

  const defaultRecordType: LeadRecordType =
    initialData?.lead_record_type === 'sold_lead' ? 'sold_lead' : 'lead';

  const form = useForm<LeadFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      book_title: initialData?.book_title || '',
      first_name: initialData?.first_name || (initialData?.author_name ? initialData.author_name.split(' ')[0] : ''),
      last_name: initialData?.last_name || (initialData?.author_name ? initialData.author_name.split(' ').slice(1).join(' ') : ''),
      amazon_link: initialData?.amazon_link || '',
      phone_number_1: initialData?.phone_number_1 || '',
      phone_number_2: initialData?.phone_number_2 || '',
      alternative_phone_number: initialData?.alternative_phone_number || '',
      primary_email: initialData?.primary_email || '',
      secondary_email: initialData?.secondary_email || '',
      author_bio: initialData?.author_bio || '',
      multiple_titles: initialData?.multiple_titles || false,
      other_titles: Array.isArray(initialData?.other_titles) ? initialData.other_titles : [],
      lead_record_type: defaultRecordType,
      status_id: mode === 'edit' ? initialData?.status_id || '' : '',
      publisher: initialData?.publisher || '',
      website: initialData?.website || '',
      state: initialData?.state || '',
      country: initialData?.country || '',
      pen_name: initialData?.pen_name || '',
    },
  });

  React.useEffect(() => {
    if (mode === 'edit' && initialData?.status_id) {
      form.setValue('status_id', initialData.status_id);
    }
    if (initialData?.lead_record_type === 'sold_lead' || initialData?.lead_record_type === 'lead') {
      form.setValue('lead_record_type', initialData.lead_record_type);
    }
  }, [mode, initialData?.status_id, initialData?.lead_record_type, form]);

  const handleSubmit = (data: LeadFormData) => {
    const baseFields = {
      book_title: data.book_title?.trim() || null,
      author_name: `${data.first_name} ${data.last_name}`.trim(),
      first_name: data.first_name,
      last_name: data.last_name,
      amazon_link: data.amazon_link || null,
      phone_number_1: data.phone_number_1 || null,
      phone_number_2: data.phone_number_2 || null,
      alternative_phone_number: data.alternative_phone_number || null,
      primary_email: data.primary_email || null,
      secondary_email: data.secondary_email || null,
      author_bio: data.author_bio || null,
      multiple_titles: data.multiple_titles,
      other_titles: data.other_titles?.length ? data.other_titles : null,
      publisher: data.publisher || null,
      website: data.website || null,
      state: data.state || null,
      country: data.country || null,
      pen_name: data.pen_name?.trim() ? data.pen_name.trim() : null,
      lead_record_type: data.lead_record_type,
    };

    if (mode === 'edit') {
      const updatePayload: UpdateLeadData = {
        ...baseFields,
        status_id: data.status_id,
      };
      onSubmit(updatePayload);
      return;
    }

    const pipelineId = resolveUnassignedPipelineStatusId(statuses);
    if (!pipelineId) {
      toast({
        variant: 'destructive',
        title: 'Pipeline status missing',
        description: 'Add an active status named "Unassigned" in Admin, or contact an administrator.',
      });
      return;
    }

    const submitData: CreateLeadData = {
      ...baseFields,
      status_id: pipelineId,
      created_by: user?.id || '',
      assigned_to: user?.role === 'sales' ? user.id : null,
    };

    onSubmit(submitData);
  };

  const sortedStatuses = React.useMemo(
    () => [...statuses].sort((a, b) => a.order_index - b.order_index),
    [statuses],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="book_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Title</FormLabel>
                  <FormControl>
                    <Input placeholder={DEFAULT_BOOK_TITLE_DISPLAY} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pen_name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Pen Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional pen name / pseudonym" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="amazon_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amazon Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://amazon.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="primary_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="author@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondary_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="author.alt@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="phone_number_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1-555-0123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1-555-0124" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alternative_phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternative Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1-555-0125" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://authorwebsite.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="publisher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher</FormLabel>
                  <FormControl>
                    <Input placeholder="Publisher name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Province</FormLabel>
                  <FormControl>
                    <Input placeholder="California" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="lead_record_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEAD_RECORD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LEAD_RECORD_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Whether this record is an active lead or a sold lead. Default is Lead. This is not the same as pipeline
                  stage (e.g. New Lead, Contacted).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === 'create' ? (
            <FormItem>
              <FormLabel>Pipeline status</FormLabel>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                Unassigned
              </div>
              <FormDescription>New leads always enter the pipeline as Unassigned. Change stage from the lead list or detail view.</FormDescription>
            </FormItem>
          ) : (
            <FormField
              control={form.control}
              name="status_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pipeline stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="author_bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Bio</FormLabel>
                <FormControl>
                  <Textarea placeholder="Brief description of the author..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useStatuses } from '@/hooks/useStatuses';
import { useAuth } from '@/hooks/useAuth';
import type { CreateLeadData } from '@/lib/api/leads';

const leadFormSchema = z.object({
  book_title: z.string().min(1, 'Book title is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  amazon_link: z.string().url('Invalid URL format').optional().or(z.literal('')),
  phone_number_1: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
  phone_number_2: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
  primary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  secondary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  author_bio: z.string().optional(),
  multiple_titles: z.boolean().default(false),
  other_titles: z.array(z.string()).optional(),
  status_id: z.string().min(1, 'Status is required'),
  publisher: z.string().optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  state: z.string().optional(),
  country: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  onSubmit: (data: CreateLeadData) => void;
  isLoading?: boolean;
  initialData?: Partial<LeadFormData & { author_name?: string }>;
}

export const LeadForm: React.FC<LeadFormProps> = ({ 
  onSubmit, 
  isLoading = false, 
  initialData 
}) => {
  const { user } = useAuth();
  const { data: statuses = [] } = useStatuses();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      book_title: initialData?.book_title || '',
      first_name: initialData?.first_name || (initialData?.author_name ? initialData.author_name.split(' ')[0] : ''),
      last_name: initialData?.last_name || (initialData?.author_name ? initialData.author_name.split(' ').slice(1).join(' ') : ''),
      amazon_link: initialData?.amazon_link || '',
      phone_number_1: initialData?.phone_number_1 || '',
      phone_number_2: initialData?.phone_number_2 || '',
      primary_email: initialData?.primary_email || '',
      secondary_email: initialData?.secondary_email || '',
      author_bio: initialData?.author_bio || '',
      multiple_titles: initialData?.multiple_titles || false,
      other_titles: Array.isArray(initialData?.other_titles) ? initialData.other_titles : [],
      status_id: initialData?.status_id || '',
      publisher: initialData?.publisher || '',
      website: initialData?.website || '',
      state: initialData?.state || '',
      country: initialData?.country || '',
    },
  });

  // Get the first status as default
  React.useEffect(() => {
    if (statuses.length > 0 && !form.getValues('status_id')) {
      const firstStatus = statuses.sort((a, b) => a.order_index - b.order_index)[0];
      form.setValue('status_id', firstStatus.id);
    }
  }, [statuses, form]);

  const handleSubmit = (data: LeadFormData) => {
    const submitData: CreateLeadData = {
      book_title: data.book_title,
      author_name: `${data.first_name} ${data.last_name}`.trim(),
      first_name: data.first_name,
      last_name: data.last_name,
      amazon_link: data.amazon_link || null,
      phone_number_1: data.phone_number_1 || null,
      phone_number_2: data.phone_number_2 || null,
      primary_email: data.primary_email || null,
      secondary_email: data.secondary_email || null,
      author_bio: data.author_bio || null,
      multiple_titles: data.multiple_titles,
      other_titles: data.other_titles?.length ? data.other_titles : null,
      publisher: data.publisher || null,
      website: data.website || null,
      state: data.state || null,
      country: data.country || null,
      status_id: data.status_id,
      created_by: user?.id || '',
      assigned_to: user?.role === 'sales' ? user.id : null,
    };

    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="book_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter book title" {...field} />
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

        {/* Contact Information */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone_number_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Phone</FormLabel>
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
                  <FormLabel>Secondary Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1-555-0124" {...field} />
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

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            name="status_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statuses
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
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

          <FormField
            control={form.control}
            name="author_bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Bio</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description of the author..."
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
}; 
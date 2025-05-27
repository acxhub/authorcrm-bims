import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStatuses } from '@/hooks/useStatuses';
import { useAuth } from '@/hooks/useAuth';
import type { Lead, CreateLeadData, UpdateLeadData } from '@/lib/api/leads';

const leadFormSchema = z.object({
  book_title: z.string().min(1, 'Book title is required'),
  author_name: z.string().min(1, 'Author name is required'),
  amazon_link: z.string().url('Invalid URL format').optional().or(z.literal('')),
  phone_number_1: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
  phone_number_2: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone format').optional().or(z.literal('')),
  primary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  secondary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  author_bio: z.string().optional(),
  multiple_titles: z.boolean().default(false),
  other_titles: z.array(z.string()).optional(),
  status_id: z.string().min(1, 'Status is required'),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: CreateLeadData | UpdateLeadData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ 
  lead, 
  onSubmit, 
  onCancel,
  isLoading = false 
}) => {
  const { user } = useAuth();
  const { data: statuses, isLoading: statusesLoading } = useStatuses();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      book_title: lead?.book_title || '',
      author_name: lead?.author_name || '',
      amazon_link: lead?.amazon_link || '',
      phone_number_1: lead?.phone_number_1 || '',
      phone_number_2: lead?.phone_number_2 || '',
      primary_email: lead?.primary_email || '',
      secondary_email: lead?.secondary_email || '',
      author_bio: lead?.author_bio || '',
      multiple_titles: lead?.multiple_titles || false,
      other_titles: (lead?.other_titles as string[]) || [],
      status_id: lead?.status_id || '',
    },
  });

  const multipleTitles = form.watch('multiple_titles');

  const handleSubmit = (data: LeadFormData) => {
    const submitData = {
      ...data,
      amazon_link: data.amazon_link || null,
      phone_number_1: data.phone_number_1 || null,
      phone_number_2: data.phone_number_2 || null,
      primary_email: data.primary_email || null,
      secondary_email: data.secondary_email || null,
      author_bio: data.author_bio || null,
      other_titles: data.other_titles?.length ? data.other_titles : null,
      created_by: user?.id || '',
    };

    onSubmit(submitData);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{lead ? 'Edit Lead' : 'Create New Lead'}</CardTitle>
        <CardDescription>
          {lead ? 'Update the lead information below.' : 'Enter the details for the new lead.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
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
                name="author_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter author name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
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
                      <Input type="email" placeholder="secondary@example.com" {...field} />
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

            {/* Amazon Link */}
            <FormField
              control={form.control}
              name="amazon_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amazon Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://amazon.com/dp/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Author Bio */}
            <FormField
              control={form.control}
              name="author_bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the author's background and expertise..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multiple Titles */}
            <FormField
              control={form.control}
              name="multiple_titles"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Author has multiple titles?</FormLabel>
                    <FormDescription>
                      Check this if the author has published multiple books.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Other Titles (conditional) */}
            {multipleTitles && (
              <FormField
                control={form.control}
                name="other_titles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Titles</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List other book titles (one per line)"
                        value={field.value?.join('\n') || ''}
                        onChange={(e) => {
                          const titles = e.target.value.split('\n').filter(title => title.trim());
                          field.onChange(titles);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter each book title on a separate line.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Status */}
            <FormField
              control={form.control}
              name="status_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                    disabled={statusesLoading || !statuses?.length}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusesLoading ? (
                        <SelectItem value="__loading" disabled>Loading statuses...</SelectItem>
                      ) : statuses?.length ? (
                        statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__empty" disabled>No statuses found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}; 
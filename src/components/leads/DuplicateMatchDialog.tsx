import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_LABELS, type DuplicatePoint } from '@/lib/duplicate-detection';
import type { DuplicateMatch } from '@/lib/api/leads';

interface DuplicateMatchDialogProps {
  open: boolean;
  /** HIGH-tier => 'block' (override required), MEDIUM-tier => 'warn'. */
  mode: 'block' | 'warn';
  matches: DuplicateMatch[];
  /** Proceed and create/save anyway (explicit override). */
  onProceed: () => void;
  /** Cancel the save and return to the form. */
  onCancel: () => void;
}

const maskEmail = (email: string | null) => {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${user.length > 2 ? '•••' : ''}@${domain}`;
};

const maskPhone = (phone: string | null) => {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `•••• ${digits.slice(-4)}`;
};

const tierBadgeClass: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const DuplicateMatchDialog: React.FC<DuplicateMatchDialogProps> = ({
  open,
  mode,
  matches,
  onProceed,
  onCancel,
}) => {
  const isBlock = mode === 'block';

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className={cn('h-5 w-5', isBlock ? 'text-red-600' : 'text-amber-600')} />
            {isBlock ? 'Possible duplicate lead' : 'Similar lead found'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlock
              ? 'This lead strongly matches an existing record. Review it before creating a duplicate.'
              : 'This lead is similar to an existing record. You can open it or create anyway.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[320px] space-y-2 overflow-y-auto">
          {matches.map((m) => (
            <div key={m.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{m.author_name || '(no name)'}</p>
                  {m.book_title && <p className="text-xs text-gray-600 truncate">{m.book_title}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {maskEmail(m.primary_email)} · {maskPhone(m.phone_number_1)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={tierBadgeClass[m.tier]}>{m.tier}</Badge>
                  <a
                    href={`/leads/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {m.matched_on.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px]">
                    {FIELD_LABELS[f as DuplicatePoint] ?? f}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant={isBlock ? 'destructive' : 'default'}
            onClick={onProceed}
          >
            {isBlock ? 'Create anyway' : 'Create anyway'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

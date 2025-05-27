import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2 } from 'lucide-react';

interface MoveLeadModalProps {
  open: boolean;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
  fromStatus: string;
  toStatus: string;
  leadTitle: string;
  isLoading?: boolean;
}

export const MoveLeadModal: React.FC<MoveLeadModalProps> = ({
  open,
  onConfirm,
  onCancel,
  fromStatus,
  toStatus,
  leadTitle,
  isLoading = false,
}) => {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined);
    setNote(''); // Reset note after confirmation
  };

  const handleCancel = () => {
    setNote(''); // Reset note on cancel
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Status Change</DialogTitle>
          <DialogDescription>
            You're about to move "{leadTitle}" to a new status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Change Visualization */}
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">{fromStatus}</div>
              <div className="text-xs text-gray-500">Current</div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="text-center">
              <div className="text-sm font-medium text-blue-600">{toStatus}</div>
              <div className="text-xs text-gray-500">New</div>
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="move-note">Add a note (optional)</Label>
            <Textarea
              id="move-note"
              placeholder="Add any relevant details about this status change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              'Confirm Move'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PipelineLeadCard } from './PipelineLeadCard';
import type { Status } from '@/lib/api/statuses';
import type { Lead } from '@/lib/api/leads';

interface PipelineColumnProps {
  status: Status;
  leads: Lead[];
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({ status, leads }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]">
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-t-lg border border-b-0">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-medium text-gray-900">{status.name}</h3>
        </div>
        <div className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
          {leads.length}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] p-3 bg-gray-50 rounded-b-lg border border-t-0 transition-colors ${
          isOver ? 'bg-blue-50 border-blue-200' : ''
        }`}
      >
        <SortableContext items={leads.map(lead => lead.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {leads.map((lead) => (
              <PipelineLeadCard key={lead.id} lead={lead} />
            ))}
            {leads.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No leads in this stage
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}; 
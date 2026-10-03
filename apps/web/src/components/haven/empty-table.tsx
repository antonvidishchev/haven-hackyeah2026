import type { LucideIcon } from 'lucide-react';

import { EmptyState } from '@/components/haven/empty-state';
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** A staff table's column headings above an empty state, so the layout stays recognisable. */
export function EmptyTable({
  columns,
  icon,
  title,
  body,
}: {
  columns: string[];
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="staff-panel flex flex-col gap-4 p-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} scope="col" className="px-4">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      <EmptyState icon={icon} title={title} className="mx-4 mb-4 border-0 bg-transparent py-6">
        {body}
      </EmptyState>
    </div>
  );
}

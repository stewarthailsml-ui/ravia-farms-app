import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  footer?: ReactNode;
  emptyMessage?: string;
}

export function Table<T extends { id?: string | number }>({
  columns,
  rows,
  footer,
  emptyMessage = "No records yet.",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left p-3 text-muted font-semibold text-[0.75rem] uppercase tracking-wider border-b border-hairline"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-muted py-8"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-hairline">
                {columns.map((c) => (
                  <td key={c.key} className={`p-4 align-middle text-[#e0e0e0] ${c.className ?? ""}`}>
                    {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer ? (
          <tfoot className="bg-[#1a1a1a] font-bold text-primary">
            {footer}
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

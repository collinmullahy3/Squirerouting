import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  mobileLabel?: string;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  keyField: keyof T;
  className?: string;
  emptyMessage?: string;
}

export function ResponsiveTable<T extends object>({
  data,
  columns,
  onRowClick,
  keyField,
  className,
  emptyMessage = 'No data available'
}: ResponsiveTableProps<T>) {
  // Filter columns that should appear on mobile
  const mobileColumns = columns.filter(col => !col.hideOnMobile);

  // Function to get the value for a cell based on accessorKey or cell function
  const getCellValue = (item: T, column: Column<T>) => {
    if (column.cell) {
      return column.cell(item);
    }

    // Handle nested properties (e.g., "assignedAgent.name")
    const accessorKey = column.accessorKey.toString();
    if (accessorKey.includes('.')) {
      const keys = accessorKey.split('.');
      let value: any = item;
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined || value === null) break;
      }
      return value === undefined || value === null ? null : value;
    }

    return (item as any)[accessorKey];
  };

  // If there's no data, show an empty message
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">{emptyMessage}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`w-full ${className || ''}`}>
      {/* Desktop view (traditional table) - hidden on small screens */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.accessorKey.toString()} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={String(item[keyField])}
                onClick={() => onRowClick && onRowClick(item)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {columns.map((column) => (
                  <TableCell key={`${String(item[keyField])}-${column.accessorKey.toString()}`} className={column.className}>
                    {getCellValue(item, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view (card-based) - shown only on small screens */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <Card 
            key={String(item[keyField])} 
            className={`overflow-hidden hover:shadow-md transition-shadow ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick && onRowClick(item)}
          >
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3">
                {mobileColumns.map((column) => (
                  <div key={column.accessorKey.toString()} className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      {column.mobileLabel || column.header}:
                    </span>
                    <div className="mt-1">
                      {getCellValue(item, column)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

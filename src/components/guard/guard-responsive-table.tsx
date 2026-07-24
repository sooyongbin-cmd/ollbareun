"use client";

import * as React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export interface GuardResponsiveTableColumn {
  key: string;
  header: string;
  className?: string;
}

export interface GuardResponsiveTableProps<T> {
  columns: GuardResponsiveTableColumn[];
  data: T[];
  keyExtractor: (item: T) => string;
  renderCell: (item: T, columnKey: string) => React.ReactNode;
  emptyMessage?: string;
}

export function GuardResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  renderCell,
  emptyMessage = "데이터가 없습니다.",
}: GuardResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground italic border rounded-lg bg-card">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop view: Standard Table */}
      <div className="hidden sm:block rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {renderCell(item, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view: Stacked Card Rows */}
      <div className="sm:hidden space-y-3">
        {data.map((item) => (
          <Card key={keyExtractor(item)} className="p-4 shadow-none border">
            <CardContent className="p-0 space-y-2 text-sm">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between py-1 border-b last:border-0 border-border/40"
                >
                  <span className="font-medium text-muted-foreground">
                    {col.header}
                  </span>
                  <span className="font-semibold text-foreground text-right">
                    {renderCell(item, col.key)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

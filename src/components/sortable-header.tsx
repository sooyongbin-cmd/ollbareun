import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableHeaderProps<T extends string> {
  sortKey: T;
  currentSortKey: T;
  sortDirection: "asc" | "desc";
  onSort: (key: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableHeader<T extends string>({
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  children,
  className = "",
}: SortableHeaderProps<T>) {
  const isActive = sortKey === currentSortKey;

  return (
    <TableHead
      aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      className={cn("select-none", className)}
      onClick={() => onSort(sortKey)}
    >
      <Button
        aria-label={`${String(children)} 기준 ${isActive && sortDirection === "asc" ? "내림차순" : "오름차순"} 정렬`}
        className="-ml-3 h-8 px-3 text-muted-foreground hover:text-foreground"
        type="button"
        variant="ghost"
      >
        <span>{children}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ChevronUp aria-hidden="true" className="size-4" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-4" />
          )
        ) : (
          <ChevronUp aria-hidden="true" className="size-4 opacity-30" />
        )}
      </Button>
    </TableHead>
  );
}

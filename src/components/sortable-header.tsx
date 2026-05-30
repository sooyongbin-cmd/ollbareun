import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
    <th
      className={`cursor-pointer select-none hover:bg-canvas-parchment transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ChevronUp size={16} className="text-ink-muted-48" />
          ) : (
            <ChevronDown size={16} className="text-ink-muted-48" />
          )
        ) : (
          <ChevronUp size={16} className="text-ink-muted-48/20" aria-hidden="true" />
        )}
      </div>
    </th>
  );
}

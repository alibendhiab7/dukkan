import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;

interface UseSortableDataProps<T> {
  items: T[];
  defaultKey?: keyof T;
  defaultDirection?: SortDirection;
}

export function useSortableData<T extends Record<string, any>>({ items, defaultKey, defaultDirection = 'asc' }: UseSortableDataProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const sortedItems = useMemo(() => {
    if (!sortKey || !sortDirection) return items;

    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      let aValCompare: any = aVal === null || aVal === undefined ? '' : aVal;
      let bValCompare: any = bVal === null || bVal === undefined ? '' : bVal;

      if (typeof aValCompare === 'string') aValCompare = aValCompare.toLowerCase();
      if (typeof bValCompare === 'string') bValCompare = bValCompare.toLowerCase();

      if (aValCompare < bValCompare) return sortDirection === 'asc' ? -1 : 1;
      if (aValCompare > bValCompare) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDirection]);

  const requestSort = (key: keyof T) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortKey(null); setSortDirection(null); }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return { sortedItems, requestSort, sortKey, sortDirection };
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (key: string) => void;
  style?: React.CSSProperties;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({ label, sortKey, currentSortKey, currentSortDirection, onSort, style }) => {
  const isActive = currentSortKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{ ...style, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        {label}
        {isActive ? (
          currentSortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        ) : (
          <span style={{ opacity: 0.3 }}><ChevronUp size={12} /></span>
        )}
      </span>
    </th>
  );
};

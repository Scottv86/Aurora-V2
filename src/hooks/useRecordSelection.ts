import { useState, useMemo, useCallback } from 'react';

export interface UseRecordSelectionReturn<T> {
  selectedIds: (string | number)[];
  selectedSet: Set<string | number>;
  selectedItems: T[];
  selectedCount: number;
  isSelected: (id: string | number) => boolean;
  toggleRecord: (id: string | number) => void;
  selectRecord: (id: string | number) => void;
  deselectRecord: (id: string | number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

export function useRecordSelection<T extends { id?: string | number }>(
  records: T[] = [],
  getId: (record: T) => string | number = (r) => r.id!
): UseRecordSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedItems = useMemo(() => {
    return records.filter(r => {
      const id = getId(r);
      return id !== undefined && selectedSet.has(id);
    });
  }, [records, selectedSet, getId]);

  const isSelected = useCallback(
    (id: string | number) => selectedSet.has(id),
    [selectedSet]
  );

  const toggleRecord = useCallback((id: string | number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const selectRecord = useCallback((id: string | number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const deselectRecord = useCallback((id: string | number) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(
      records
        .map(r => getId(r))
        .filter((id): id is string | number => id !== undefined)
    );
  }, [records, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectedCount = selectedIds.length;
  const isAllSelected = records.length > 0 && selectedCount >= records.length;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  return {
    selectedIds,
    selectedSet,
    selectedItems,
    selectedCount,
    isSelected,
    toggleRecord,
    selectRecord,
    deselectRecord,
    selectAll,
    clearSelection,
    setSelectedIds,
    isAllSelected,
    isSomeSelected
  };
}

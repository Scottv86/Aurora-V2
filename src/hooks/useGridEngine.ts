import { useState, useCallback } from 'react';

export interface GridPos {
  x: number; // 0-11
  y: number; // row index
  w: number; // span 1-12
  h: number; // row span
}

export interface GridItem extends GridPos {
  id: string;
}
export const useGridEngine = (cols: number = 12) => {
  const [activeItem, setActiveItem] = useState<GridItem | null>(null);

  const isOverlapping = useCallback((a: GridPos, b: GridPos) => {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }, []);

  const compact = useCallback((items: GridItem[]): GridItem[] => {
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const columnTops = new Array(cols).fill(0);
    
    return sorted.map(item => {
      let targetRow = 0;
      for (let i = item.x; i < Math.min(cols, item.x + item.w); i++) {
        targetRow = Math.max(targetRow, columnTops[i]);
      }
      
      const newItem = { ...item, y: targetRow };
      for (let i = newItem.x; i < Math.min(cols, newItem.x + newItem.w); i++) {
        columnTops[i] = newItem.y + newItem.h;
      }
      return newItem;
    });
  }, [cols]);

  const resolveCollisions = useCallback((movedItem: GridItem, allItems: GridItem[]): GridItem[] => {
    let result = [...allItems];
    const movedIdx = result.findIndex(i => i.id === movedItem.id);
    if (movedIdx !== -1) result[movedIdx] = movedItem;
    else result.push(movedItem);

    let hasCollisions = true;
    let iterations = 0;
    
    while (hasCollisions && iterations < 50) {
      hasCollisions = false;
      iterations++;
      
      // Sort items by Y then X to handle cascading correctly
      result.sort((a, b) => a.y - b.y || a.x - b.x);

      for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result.length; j++) {
          if (i === j) continue;
          
          const a = result[i];
          const b = result[j];
          
          if (isOverlapping(a, b)) {
            hasCollisions = true;
            // If the item we're overlapping with is NOT the one we just moved,
            // bump it down. If it IS the moved item, bump the other one.
            const toBumpIdx = (b.id === movedItem.id) ? i : j;
            const bumpedItem = result[toBumpIdx];
            const otherItem = result[toBumpIdx === i ? j : i];
            
            result[toBumpIdx] = {
              ...bumpedItem,
              y: otherItem.y + otherItem.h
            };
          }
        }
      }
    }

    return result;
  }, [isOverlapping]);

  const snapToGrid = useCallback((posX: number, posY: number, containerWidth: number, rowHeight: number, gap: number = 0, padding: number = 0): { x: number, y: number } => {
    const usableWidth = containerWidth - (padding * 2);
    const colWidth = (usableWidth + gap) / cols;
    // Ensure x is within 0 to cols-1
    const x = Math.max(0, Math.min(cols - 1, Math.round((posX - padding) / colWidth)));
    // Ensure y is at least 0
    const y = Math.max(0, Math.floor((posY - padding) / (rowHeight + gap)));
    return { x, y };
  }, [cols]);

  return {
    activeItem,
    setActiveItem,
    resolveCollisions,
    compact,
    snapToGrid,
    isOverlapping
  };
};

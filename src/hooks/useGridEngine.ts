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

  const resolveCollisions = useCallback((movedItem: GridItem, allItems: GridItem[]): GridItem[] => {
    let result = [...allItems];
    const movedIdx = result.findIndex(i => i.id === movedItem.id);
    if (movedIdx !== -1) result[movedIdx] = movedItem;
    else result.push(movedItem);

    let hasCollisions = true;
    let iterations = 0;
    
    // Simple vertical bump strategy
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
            const toBumpIdx = (b.id === movedItem.id) ? i : j;
            const bumpedItem = result[toBumpIdx];
            console.log(`[GridEngine] Collision detected between ${a.id} and ${b.id}. Bumping ${bumpedItem.id} to Y: ${result[toBumpIdx] === a ? b.y + b.h : a.y + a.h}`);
            
            result[toBumpIdx] = {
              ...result[toBumpIdx],
              y: result[toBumpIdx] === a ? b.y + b.h : a.y + a.h
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
    const x = Math.max(0, Math.min(cols - 1, Math.round((posX - padding) / colWidth)));
    const y = Math.max(0, Math.round((posY - padding) / (rowHeight + gap)));
    return { x, y };
  }, [cols]);

  return {
    activeItem,
    setActiveItem,
    resolveCollisions,
    snapToGrid,
    isOverlapping
  };
};

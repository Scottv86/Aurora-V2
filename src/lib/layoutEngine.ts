import { calculateHeight } from './utils';

/**
 * Dynamic Gravity Compaction
 * Pulls fields upward to fill empty vertical space while preserving horizontal column alignment.
 */
export function compactLayout(fields: any[]): any[] {
  if (!fields || fields.length === 0) return [];

  // Sort fields by their original row index, then by column
  const sortedFields = [...fields].sort((a, b) => {
    if ((a.rowIndex || 0) !== (b.rowIndex || 0)) return (a.rowIndex || 0) - (b.rowIndex || 0);
    return (a.startCol || 1) - (b.startCol || 1);
  });

  // Track the next available row index for each of the 12 columns
  const columnTops = new Array(13).fill(0); 

  return sortedFields.map(field => {
    const startCol = field.startCol || 1;
    const colSpan = field.colSpan || 12;
    const height = calculateHeight(field);
    const endCol = Math.min(13, startCol + colSpan);

    // Find the highest available row in the columns this field spans
    let targetRow = 0;
    for (let i = startCol; i < endCol; i++) {
      targetRow = Math.max(targetRow, columnTops[i]);
    }

    // Update the column tops for the rows this field now occupies
    const newRowIndex = targetRow;
    for (let i = startCol; i < endCol; i++) {
      columnTops[i] = newRowIndex + height;
    }

    return {
      ...field,
      rowIndex: newRowIndex
    };
  });
}

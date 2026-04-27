import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Layers, Check, X, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FieldInput } from '../FieldInput';
import { useModalStack } from '../../context/ModalStackContext';

interface RepeatableGroupBlockProps {
  field: any; // The field definition from the layout
  value: any[]; // The array of sub-records
  onChange?: (newValue: any[]) => void;
  readOnly?: boolean;
}

export const RepeatableGroupBlock: React.FC<RepeatableGroupBlockProps> = ({
  field,
  value = [],
  onChange,
  readOnly = false
}) => {
  const { pushModal } = useModalStack();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);

  // Default to table if not specified
  const displayMode = field.variant || 'table';

  const handleAdd = () => {
    if (readOnly) return;
    const newRow = {};
    const newValue = [...value, newRow];
    setEditBuffer(newRow);
    setEditingIndex(newValue.length - 1);
  };

  const handleRemove = (index: number) => {
    if (readOnly) return;
    const newValue = value.filter((_, i) => i !== index);
    onChange?.(newValue);
  };

  const handleEdit = (index: number) => {
    if (readOnly) return;
    setEditingIndex(index);
    setEditBuffer({ ...value[index] });
  };

  const handleSaveRow = () => {
    if (editingIndex === null) return;
    const newValue = [...value];
    newValue[editingIndex] = editBuffer;
    onChange?.(newValue);
    setEditingIndex(null);
    setEditBuffer(null);
  };

  const handleCancelRow = () => {
    setEditingIndex(null);
    setEditBuffer(null);
  };

  const handleDrillDown = (index: number) => {
    const row = value[index];
    pushModal({
      moduleId: 'virtual',
      type: 'edit',
      title: `${field.label} Detail`,
      localData: row,
      localSchema: field.fields,
      onSaveLocal: (updatedRow) => {
        const newValue = [...value];
        newValue[index] = updatedRow;
        onChange?.(newValue);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
            <Layers size={14} />
          </div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h3>
          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[9px] font-bold text-zinc-400">
            {value.length}
          </span>
        </div>
        {!readOnly && (
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-indigo-500 hover:bg-indigo-500/5 transition-all uppercase tracking-widest"
          >
            <Plus size={14} />
            Add Row
          </button>
        )}
      </div>

      {displayMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {value.map((row, idx) => (
            <button
              key={idx}
              onClick={() => handleDrillDown(idx)}
              className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <Layers size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                    {row[field.fields[0]?.id] || `Item ${idx + 1}`}
                  </p>
                  <p className="text-[10px] text-zinc-500">{field.fields.length} properties defined</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-zinc-300 group-hover:text-indigo-500 transition-all transform group-hover:translate-x-0.5" />
            </button>
          ))}
          {value.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-[32px]">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Items</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                {(field.fields || []).map((subField: any) => (
                  <th key={subField.id} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {subField.label}
                  </th>
                ))}
                {!readOnly && <th className="px-4 py-3 text-right w-24"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {value.length === 0 && editingIndex === null ? (
                <tr>
                  <td colSpan={(field.fields?.length || 0) + (readOnly ? 0 : 1)} className="px-4 py-12 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Records Yet</p>
                    {!readOnly && <p className="text-[9px] text-zinc-500 mt-1">Click 'Add Row' to start recording data.</p>}
                  </td>
                </tr>
              ) : (
                value.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    {editingIndex === idx ? (
                      <>
                        {field.fields.map((subField: any) => (
                          <td key={subField.id} className="px-3 py-2">
                            <FieldInput 
                              field={subField}
                              value={editBuffer[subField.id]}
                              onChange={(val) => setEditBuffer({ ...editBuffer, [subField.id]: val })}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={handleSaveRow} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg">
                              <Check size={14} />
                            </button>
                            <button onClick={handleCancelRow} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg">
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {field.fields.map((subField: any) => (
                          <td key={subField.id} className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                            {String(row[subField.id] || '-')}
                          </td>
                        ))}
                        {!readOnly && (
                          <td className="px-4 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleEdit(idx)} className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded-lg transition-colors">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleRemove(idx)} className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

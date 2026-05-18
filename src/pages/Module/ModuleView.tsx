import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Table } from '../../components/UI/Table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/UI/PageHeader';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Plus, 
  Trash2,
  Search,
  Filter,
  X
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { FieldInput } from '../../components/FieldInput';
import { Skeleton } from '../../components/UI/Skeleton';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { fetchModule, fetchRecords } from '../../services/dataService';
import { cn, isFieldVisible, flattenFields } from '../../lib/utils';
import { Module, ModuleField } from '../../types/platform';
import { calculateDefaultValue } from '../../services/fieldService';
import { CollapsibleFieldGroup } from '../../components/UI/CollapsibleFieldGroup';
import { RepeatableGroupBlock } from '../../components/Platform/RepeatableGroupBlock';

import { useModalStack } from '../../context/ModalStackContext';

export const ModuleView = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { tenant, isLoading: platformLoading, modules, members } = usePlatform();
  useModalStack();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  // Use TanStack Query states instead
  // const [loading, setLoading] = useState(true);
  // const [recordsLoading, setRecordsLoading] = useState(true);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [newEntryData, setNewEntryData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = useMemo(() => {
    return (moduleData as any)?.interfaceSettings?.master?.pagination?.pageSize || 25;
  }, [moduleData]);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const visibleTabs = useMemo(() => {
    if (!moduleData?.tabs) return [];
    return moduleData.tabs.filter(tab => isFieldVisible(tab, newEntryData, { user }));
  }, [moduleData?.tabs, newEntryData, user]);

  useEffect(() => {
    if (visibleTabs.length > 0 && (!activeTabId || !visibleTabs.find(t => t.id === activeTabId))) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);

  const Icon = useMemo(() => {
    if (!moduleData) return LucideIcons.Layers;
    const iconSource = (moduleData as any).iconName || (moduleData as any).icon;
    
    if (typeof iconSource === 'string' && iconSource.trim() !== '') {
      return (LucideIcons as any)[iconSource] || LucideIcons.Layers;
    }
    
    if (typeof iconSource === 'function' || (typeof iconSource === 'object' && iconSource !== null && (iconSource as any).$$typeof)) {
      return iconSource;
    }
    
    return LucideIcons.Layers;
  }, [moduleData]);

  const allFields = useMemo(() => {
    return flattenFields(moduleData?.layout || []) as ModuleField[];
  }, [moduleData]);

  const displayFields = useMemo(() => {
    return allFields.filter((f: ModuleField) => 
      !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)
    );
  }, [allFields]);

  const fieldToGroupMap = useMemo(() => {
    const map: Record<string, string> = {};
    const containerTypes = ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'];
    
    const processFields = (fields: any[], parentId?: string) => {
      fields.forEach((f: any) => {
        if (parentId) {
          map[f.id] = parentId;
        }
        if (containerTypes.includes(f.type) && f.fields) {
          processFields(f.fields, f.id);
        }
      });
    };
    
    processFields(moduleData?.layout || []);
    return map;
  }, [moduleData]);

  const queryClient = useQueryClient();
  const { data: moduleResult, isLoading: moduleQueryLoading, error: moduleError } = useQuery({
    queryKey: ['module', tenant?.id, moduleId],
    queryFn: async () => {
      if (!tenant?.id || !moduleId) return null;
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      return fetchModule(moduleId, tenant.id, token, modules);
    },
    enabled: !!tenant?.id && !!moduleId && !platformLoading && (!!session?.access_token || !!(import.meta as any).env.VITE_DEV_TOKEN)
  });

  const { data: recordsResult, isLoading: recordsQueryLoading } = useQuery({
    queryKey: ['records', tenant?.id, moduleId, page, pageSize],
    queryFn: async () => {
      if (!tenant?.id || !moduleId) return null;
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      return fetchRecords(moduleId, tenant.id, token, page, pageSize);
    },
    enabled: !!tenant?.id && !!moduleId && !platformLoading && (!!session?.access_token || !!(import.meta as any).env.VITE_DEV_TOKEN)
  });

  // Clear data when moduleId changes to prevent stale UI
  useEffect(() => {
    setModuleData(null);
    setRecords([]);
    setPage(1);
  }, [moduleId]);

  useEffect(() => {
    if (moduleResult) setModuleData(moduleResult);
  }, [moduleResult]);

  useEffect(() => {
    if (recordsResult) {
      setRecords(recordsResult.records);
      setTotalRecords(recordsResult.total);
      setTotalPages(recordsResult.totalPages);
    }
  }, [recordsResult]);

  // Combined loading state for progressive rendering
  const isSessionReady = !!session?.access_token || !!(import.meta as any).env.VITE_DEV_TOKEN;
  const loading = moduleQueryLoading || !isSessionReady;
  const recordsLoading = recordsQueryLoading;

  const createMutation = useMutation({
    mutationFn: async (finalData: any) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          moduleId: moduleId,
          ...finalData
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save record');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
      // Optionally update records state directly for immediate UI feedback if needed, 
      // but invalidateQueries is safer and cleaner with pagination.
      // setRecords(prev => [savedRecord, ...prev]);
      toast.success("Record created successfully");
      setShowNewEntryModal(false);
      setNewEntryData({});
    },
    onError: (error: any) => {
      console.error("Save Error:", error);
      toast.error(error.message || (editingRecord ? "Failed to update record" : "Failed to create record"));
    }
  });

  const handleCreateEntry = async () => {
    if (!tenant?.id || !moduleId || !moduleData) return;
    
    setIsSubmitting(true);
    try {
      let finalData = evaluateCalculations(newEntryData, allFields);
      
      const hasAISummary = allFields.some(f => f.type === 'ai_summary');
      if (hasAISummary) {
        toast.info("Generating AI Summary...");
        const aiSummaryField = allFields.find(f => f.type === 'ai_summary');
        if (aiSummaryField) {
          finalData[aiSummaryField.id] = await generateAISummary(finalData, allFields);
        }
      }

      await createMutation.mutateAsync(finalData);
    } catch (error: any) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, val: any, metadata?: any) => {
    setNewEntryData(prev => {
      let updatedData = { ...prev };
      
      const groupId = fieldToGroupMap[fieldId];
      if (groupId) {
        updatedData[groupId] = { ...(prev[groupId] || {}), [fieldId]: val };
      } else {
        updatedData[fieldId] = val;
      }
      
      // Execute Lookup Output Mappings
      const field = allFields.find(f => f.id === fieldId);
      if (field?.type === 'lookup' && field.lookupOutputMappings?.length) {
        // ONLY clear and populate if the lookup value itself has changed.
        if (val !== prev[fieldId]) {
          // First, null out all target fields to clear any previously mapped values
          field.lookupOutputMappings.forEach(mapping => {
            if (mapping.targetFieldId) {
              const targetFieldId = mapping.targetFieldId;
              const targetGroupId = fieldToGroupMap[targetFieldId];
              
              if (targetGroupId) {
                updatedData[targetGroupId] = { 
                  ...(updatedData[targetGroupId] || {}), 
                  [targetFieldId]: null 
                };
              } else {
                updatedData[targetFieldId] = null;
              }
            }
          });

          // Then, map the new values from metadata if available
          if (metadata && typeof metadata === 'object') {
            field.lookupOutputMappings.forEach(mapping => {
              if (mapping.sourceFieldId && mapping.targetFieldId) {
                const sourceValue = metadata[mapping.sourceFieldId];
                if (sourceValue !== undefined) {
                  const targetFieldId = mapping.targetFieldId;
                  const targetGroupId = fieldToGroupMap[targetFieldId];
                  
                  if (targetGroupId) {
                    updatedData[targetGroupId] = { 
                      ...(updatedData[targetGroupId] || {}), 
                      [targetFieldId]: sourceValue 
                    };
                  } else {
                    updatedData[targetFieldId] = sourceValue;
                  }
                }
              }
            });
          }
        }
      }
      
      // Re-calculate dynamic defaults that might depend on this field
      allFields.forEach(f => {
        if (f.id !== fieldId && f.defaultType === 'field_copy' && f.defaultSourceFieldId === fieldId) {
          const currentVal = updatedData[f.id];
          const oldDefault = calculateDefaultValue(f, prev);
          
          // Only overwrite if it was empty or matched the previous default
          if (!currentVal || currentVal === oldDefault) {
            updatedData[f.id] = calculateDefaultValue(f, updatedData);
          }
        }
      });
      
      return updatedData;
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  const interfaceSettings = useMemo(() => {
    return (moduleData as any)?.interfaceSettings || {
      master: {
        layoutType: 'table',
        density: 'standard',
        pagination: { enabled: true, pageSize: 25 }
      },
      detail: {
        layoutType: 'tabs'
      },
      actions: []
    };
  }, [moduleData]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(record => {
      return Object.entries(record).some(([key, val]) => {
        if (key.startsWith('_') || val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [records, searchQuery]);

  const updateMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: any }) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update record');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
      toast.success("Record updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update record");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete record');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', tenant?.id, moduleId] });
      toast.success("Record deleted successfully");
      setRecordToDelete(null);
    },
    onError: (error: any) => {
      console.error("Delete Error:", error);
      toast.error(error.message || "Failed to delete record");
    }
  });

  const handleDeleteEntry = async (recordId: string) => {
    if (!tenant?.id || !moduleId) return;
    deleteMutation.mutate(recordId);
  };

  const kanbanConfig = useMemo(() => {
    const statusField = allFields.find(f => f.type === 'select' || f.id === 'status' || f.name === 'status');
    const stages = statusField?.options || ['Todo', 'In Progress', 'Done'];
    const fieldId = statusField?.id || 'status';

    const grouped: Record<string, any[]> = {};
    stages.forEach(stage => {
      grouped[stage] = [];
    });

    filteredRecords.forEach(record => {
      const val = record[fieldId] || record.status || 'Todo';
      if (grouped[val]) {
        grouped[val].push(record);
      } else {
        if (grouped[stages[0]]) grouped[stages[0]].push(record);
      }
    });

    return { stages, fieldId, grouped };
  }, [allFields, filteredRecords]);

  const handleMoveCard = (recordId: string, newStage: string) => {
    const fieldId = kanbanConfig.fieldId;
    updateMutation.mutate({
      recordId,
      data: {
        [fieldId]: newStage,
        status: newStage
      }
    });
  };

  const calendarConfig = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    const dateField = allFields.find(f => f.type === 'date') || { id: 'createdAt' };
    return { year, month, firstDayIndex, numDays, dateFieldId: dateField.id };
  }, [allFields, currentDate]);

  const dateToRecordsMap = useMemo(() => {
    const map: Record<number, any[]> = {};
    const { year, month, dateFieldId } = calendarConfig;

    filteredRecords.forEach(record => {
      const rawDate = record[dateFieldId] || record.createdAt;
      if (!rawDate) return;
      const dateObj = new Date(rawDate);
      if (dateObj.getFullYear() === year && dateObj.getMonth() === month) {
        const day = dateObj.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(record);
      }
    });

    return map;
  }, [filteredRecords, calendarConfig]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const renderKanbanView = () => {
    const { stages, grouped } = kanbanConfig;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Filter cards..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
          {stages.map((stage: string) => {
            const cards = grouped[stage] || [];
            return (
              <div 
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rId = e.dataTransfer.getData('text/plain');
                  if (rId) handleMoveCard(rId, stage);
                }}
                className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[2rem] p-6 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    {stage}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full text-[10px] font-bold text-zinc-500">
                    {cards.length}
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-1.5 custom-scrollbar">
                  {cards.map(record => (
                    <div 
                      key={record.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', record.id)}
                      onClick={() => navigate(`/workspace/modules/${moduleId}/records/${record.id}`)}
                      className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:shadow-lg transition-all group relative space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                          {record._record_key || 'Key'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecordToDelete(record.id);
                            }}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white leading-relaxed">
                          {displayFields[0] ? (record[displayFields[0].id] || record[displayFields[0].name] || '-') : 'Untitled Record'}
                        </p>
                        {displayFields.slice(1, 3).map((f: any) => {
                          const val = record[f.id] || record[f.name];
                          if (val === undefined || val === null || val === '') return null;
                          
                          if (f.type === 'user') {
                            const resolvedUser = members?.find((m: any) => m.id === val);
                            return (
                              <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium truncate">
                                <span className="font-bold text-zinc-500">{f.label}:</span>
                                <div className="flex items-center gap-1 min-w-0">
                                  {resolvedUser ? (
                                    <>
                                      <div className={cn(
                                        "w-4 h-4 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200/50 dark:border-zinc-800/50",
                                        resolvedUser.isSynthetic 
                                          ? "bg-indigo-500/10 text-indigo-600" 
                                          : "bg-zinc-100 text-zinc-600"
                                      )}>
                                        {resolvedUser.avatarUrl ? (
                                          <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
                                        ) : (
                                          resolvedUser.isSynthetic ? <LucideIcons.Bot size={8} /> : <LucideIcons.User size={8} />
                                        )}
                                      </div>
                                      <span className="text-zinc-700 dark:text-zinc-300 font-bold truncate">{resolvedUser.name}</span>
                                    </>
                                  ) : (
                                    <span className="text-zinc-500 truncate">{val}</span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <p key={f.id} className="text-[10px] text-zinc-400 font-medium truncate">
                              <span className="font-bold text-zinc-500">{f.label}:</span> {val}
                            </p>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                        {stages.indexOf(stage) > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevStage = stages[stages.indexOf(stage) - 1];
                              handleMoveCard(record.id, prevStage);
                            }}
                            className="p-1 text-[10px] font-black text-zinc-400 hover:text-indigo-500 uppercase"
                            title="Move Left"
                          >
                            ←
                          </button>
                        )}
                        {stages.indexOf(stage) < stages.length - 1 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStage = stages[stages.indexOf(stage) + 1];
                              handleMoveCard(record.id, nextStage);
                            }}
                            className="p-1 text-[10px] font-black text-zinc-400 hover:text-indigo-500 uppercase"
                            title="Move Right"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="h-28 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 text-[10px] font-bold uppercase">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    const { year, month, firstDayIndex, numDays, dateFieldId } = calendarConfig;
    const daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= numDays; d++) {
      cells.push(d);
    }

    const prevMonth = () => {
      setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
      setCurrentDate(new Date(year, month + 1, 1));
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={prevMonth}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <LucideIcons.ChevronLeft size={16} />
            </button>
            <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white min-w-[150px] text-center">
              {monthNames[month]} {year}
            </h3>
            <button 
              onClick={nextMonth}
              className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <LucideIcons.ChevronRight size={16} />
            </button>
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Date source: <span className="text-indigo-500 font-black">{allFields.find(f => f.id === dateFieldId)?.label || 'Created Date'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            {daysInWeek.map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
            {cells.map((day, idx) => {
              const dayRecords = day ? (dateToRecordsMap[day] || []) : [];
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "min-h-[120px] p-3 flex flex-col space-y-2 transition-colors",
                    !day ? "bg-zinc-50/30 dark:bg-zinc-950/10" : "bg-white dark:bg-zinc-900"
                  )}
                >
                  {day && (
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-bold font-mono",
                        new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                          ? "w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center"
                          : "text-zinc-500"
                      )}>
                        {day}
                      </span>
                      {dayRecords.length > 0 && (
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
                          {dayRecords.length}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar pr-0.5">
                    {dayRecords.map(record => (
                      <div 
                        key={record.id}
                        onClick={() => navigate(`/workspace/modules/${moduleId}/records/${record.id}`)}
                        className="px-2 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/30 rounded-lg text-[9px] font-bold text-indigo-600 dark:text-indigo-400 truncate cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <span className="truncate">{record._record_key || 'Record'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    const densityClass = (() => {
      const d = interfaceSettings.master.density || 'standard';
      if (d === 'compact') return 'px-4 py-2 text-[11px] leading-normal font-medium';
      if (d === 'spacious') return 'px-8 py-5 text-sm leading-relaxed';
      return 'px-6 py-4 text-sm';
    })();

    const hasStatusField = displayFields.some((f: any) => f.id === 'status' || f.name?.toLowerCase() === 'status');

    // Define the custom column accessor mapper
    const mapCustomFieldToColumn = (field: any) => ({
      header: field.label || field.name,
      sortable: true,
      sortKey: field.id || field.name,
      className: densityClass,
      style: field.columnWidth ? { width: `${field.columnWidth}px`, minWidth: `${field.columnWidth}px` } : undefined,
      accessor: (record: any) => {
        const val = record[field.id] || record[field.name];
        if (field.type === 'checkbox') return val ? 'Yes' : 'No';
        
        if (field.type === 'user') {
          if (!val) return '-';
          const resolvedUser = members?.find((m: any) => m.id === val);
          if (resolvedUser) {
            return (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800",
                  resolvedUser.isSynthetic 
                    ? "bg-indigo-50/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
                    : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                )}>
                  {resolvedUser.avatarUrl ? (
                    <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    resolvedUser.isSynthetic ? <LucideIcons.Bot size={12} /> : <LucideIcons.User size={12} />
                  )}
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {resolvedUser.name}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0 text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                <LucideIcons.User size={12} />
              </div>
              <span className="text-xs font-medium text-zinc-500 truncate">
                {val}
              </span>
            </div>
          );
        }
        
        if (field.type === 'repeatableGroup' || field.type === 'collection') {
          const count = Array.isArray(val) ? val.length : 0;
          return (
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-100 dark:border-indigo-500/20">
              {count} {count === 1 ? 'Item' : 'Items'}
            </span>
          );
        }

        if (Array.isArray(val)) {
          if (val.length === 0) return '-';
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {val.map((v: any, k: number) => {
                let displayStr = '';
                if (v && typeof v === 'object') {
                  const stringValues = Object.values(v).map(String).filter(s => s && s !== '[object Object]');
                  displayStr = stringValues[0] || 'Item';
                } else {
                  displayStr = String(v);
                }
                return (
                  <span key={k} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold rounded border border-zinc-200 dark:border-zinc-700 uppercase truncate max-w-[120px]" title={displayStr}>
                    {displayStr}
                  </span>
                );
              })}
            </div>
          );
        }

        if (val && typeof val === 'object') {
          return <span className="text-zinc-400 italic text-[11px]">Complex Data</span>;
        }

        // Render Status fields using the premium badge styling
        if (field.id === 'status' || field.name?.toLowerCase() === 'status') {
          return (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
              {val || record.status || '-'}
            </span>
          );
        }

        return val || '-';
      }
    });

    // Define System fields columns
    const systemColumnsMap: Record<string, any> = {
      createdAt: {
        header: 'Created',
        sortable: true,
        sortKey: 'createdAt',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'createdAt')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdAt').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdAt').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="text-sm text-zinc-500">
            {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}
          </span>
        )
      },
      createdBy: {
        header: 'Created By',
        sortable: true,
        sortKey: 'createdBy',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'createdBy')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdBy').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'createdBy').width}px` } 
          : undefined,
        accessor: (record: any) => {
          const val = record.createdBy;
          if (!val) return '-';
          const resolvedUser = members?.find((m: any) => m.id === val);
          if (resolvedUser) {
            return (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800",
                  resolvedUser.isSynthetic 
                    ? "bg-indigo-50/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
                    : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                )}>
                  {resolvedUser.avatarUrl ? (
                    <img src={resolvedUser.avatarUrl} alt={resolvedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    resolvedUser.isSynthetic ? <LucideIcons.Bot size={12} /> : <LucideIcons.User size={12} />
                  )}
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {resolvedUser.name}
                </span>
              </div>
            );
          }
          return '-';
        }
      },
      updatedAt: {
        header: 'Updated',
        sortable: true,
        sortKey: 'updatedAt',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'updatedAt')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'updatedAt').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'updatedAt').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="text-sm text-zinc-500">
            {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : 'Just now'}
          </span>
        )
      },
      status: {
        header: 'Status',
        sortable: true,
        sortKey: 'status',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === 'status')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'status').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === 'status').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
            {record.status || '-'}
          </span>
        )
      }
    };

    // Sort displayColumns based on configured order in interfaceSettings
    const activeCustomFields = displayFields.filter((field: any) => field.showInTable !== false);
    const configured = interfaceSettings.master.columns || [];

    const builtColumns: any[] = [];
    if (configured.length > 0) {
      configured.forEach((c: any) => {
        if (c.visible === false) return;
        
        // Is it a custom field?
        const customField = activeCustomFields.find(f => f.id === c.fieldId);
        if (customField) {
          builtColumns.push(mapCustomFieldToColumn(customField));
        } else if (systemColumnsMap[c.fieldId]) {
          // Is it a configured system field?
          builtColumns.push(systemColumnsMap[c.fieldId]);
        }
      });

      // Append any custom fields that are marked showInTable but weren't in configured
      activeCustomFields.forEach((field: any) => {
        if (!configured.some((c: any) => c.fieldId === field.id)) {
          builtColumns.push(mapCustomFieldToColumn(field));
        }
      });
    } else {
      // Fallback: Default ordering (Custom fields first, then default status & createdAt)
      activeCustomFields.forEach((field: any) => {
        builtColumns.push(mapCustomFieldToColumn(field));
      });
      if (!activeCustomFields.some(f => f.id === 'status' || f.name?.toLowerCase() === 'status')) {
        builtColumns.push(systemColumnsMap.status);
      }
      builtColumns.push(systemColumnsMap.createdAt);
    }

    const tableColumns = [
      {
        header: interfaceSettings.master.columns?.find((c: any) => c.fieldId === '_record_key')?.label || 'Key',
        sortable: true,
        sortKey: '_record_key',
        className: densityClass,
        style: interfaceSettings.master.columns?.find((c: any) => c.fieldId === '_record_key')?.width 
          ? { width: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === '_record_key').width}px`, minWidth: `${interfaceSettings.master.columns.find((c: any) => c.fieldId === '_record_key').width}px` } 
          : undefined,
        accessor: (record: any) => (
          <span className="text-sm font-bold text-indigo-500">
            {record._record_key || '-'}
          </span>
        )
      },
      ...builtColumns,
      {
        header: '',
        className: cn('text-right', densityClass),
        accessor: (record: any) => (
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setRecordToDelete(record.id);
              }}
              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      }
    ];

    return (
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button className="p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl">
              <Filter size={18} />
            </button>
          </div>
        </div>
        
        <Table 
          data={filteredRecords as any}
          onRowClick={(record) => navigate(`/workspace/modules/${moduleId}/records/${record.id}`)}
          className="bg-transparent dark:bg-transparent border-none shadow-none"
          noContainer={true}
          pagination={false}
          columns={tableColumns}
        />

        {interfaceSettings.master.pagination?.enabled !== false && totalRecords > 0 && (
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Showing <span className="text-zinc-900 dark:text-white">{totalRecords > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="text-zinc-900 dark:text-white">{Math.min(page * pageSize, totalRecords)}</span> of <span className="text-zinc-900 dark:text-white">{totalRecords}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {totalPages > 0 && [...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  if (totalPages > 7 && pNum > 2 && pNum < totalPages - 1 && Math.abs(pNum - page) > 1) {
                    if (pNum === 3 || pNum === totalPages - 2) return <span key={pNum} className="text-zinc-400 px-1">...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                        page === pNum 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if ((loading || platformLoading) && !moduleData) return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={180} height={32} variant="rounded" />
          <Skeleton width={350} height={20} variant="text" />
        </div>
        <div className="flex gap-4">
          <Skeleton width={100} height={40} variant="rounded" />
          <Skeleton width={120} height={40} variant="rounded" />
        </div>
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton width={200} height={40} variant="rounded" />
          <Skeleton width={40} height={40} variant="rounded" />
        </div>
        <Skeleton height={400} variant="rounded" className="rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (!moduleData && !loading) {
    if (moduleError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
          <LucideIcons.AlertCircle className="text-red-500" size={48} />
          <h2 className="text-xl font-bold">Failed to load module</h2>
          <p className="text-zinc-500">{(moduleError as any)?.message || "An unexpected error occurred"}</p>
          <button 
            onClick={() => navigate('/workspace')}
            className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold"
          >
            Go Back
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <LucideIcons.SearchX className="text-zinc-400" size={48} />
        <h2 className="text-xl font-bold">Module not found</h2>
        <p className="text-zinc-500">We couldn't find the module you're looking for ({moduleId}).</p>
        <button 
          onClick={() => navigate('/workspace')}
          className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold"
        >
          Go Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title={moduleData?.name || 'Loading...'}
        description={moduleData?.description || ''}
        icon={Icon}
        iconClassName="bg-indigo-600 shadow-indigo-500/20"
        actions={
          <div className="flex gap-4">
            <Link 
              to={`/workspace/settings/builder/${moduleId}`}
              className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2"
            >
              <LucideIcons.Settings size={16} />
              Configure
            </Link>
            <button 
              onClick={() => {
                const initialDefaults: any = {};
                allFields.forEach((f: any) => {
                  const defVal = calculateDefaultValue(f, initialDefaults);
                  if (defVal !== undefined && defVal !== null && defVal !== '') {
                    initialDefaults[f.id] = defVal;
                  }
                });
                setNewEntryData(initialDefaults);
                setEditingRecord(null);
                if (moduleData?.tabs && moduleData.tabs.length > 0) {
                  setActiveTabId(moduleData.tabs[0].id);
                } else {
                  setActiveTabId(null);
                }
                setShowNewEntryModal(true);
              }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
            >
              <Plus size={18} />
              New Entry
            </button>
          </div>
        }
      />



      {recordsLoading ? (
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-4">
            <Skeleton width={200} height={40} variant="rounded" />
            <Skeleton width={40} height={40} variant="rounded" />
          </div>
          <Skeleton height={400} variant="rounded" className="rounded-[2.5rem]" />
        </div>
      ) : records.length > 0 ? (
        interfaceSettings.master.layoutType === 'kanban' ? (
          renderKanbanView()
        ) : interfaceSettings.master.layoutType === 'calendar' ? (
          renderCalendarView()
        ) : (
          renderTableView()
        )
      ) : (
        <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-800">
            <Icon size={24} className="text-zinc-400 dark:text-zinc-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No data found in {moduleData?.name || 'Module'}</h3>
            <p className="text-zinc-500 mt-1">Start by creating your first entry or importing data.</p>
          </div>
          <button 
            onClick={() => {
              const initialDefaults = {};
              allFields.forEach((f: any) => {
                if (f.defaultValue !== undefined && f.defaultValue !== '') {
                  (initialDefaults as any)[f.id] = f.defaultValue;
                }
              });
              setNewEntryData(initialDefaults);
              setEditingRecord(null);
              if (moduleData?.tabs && moduleData.tabs.length > 0) {
                setActiveTabId(moduleData.tabs[0].id);
              } else {
                setActiveTabId(null);
              }
              setShowNewEntryModal(true);
            }}
            className="px-6 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Create First Entry
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showNewEntryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowNewEntryModal(false);
                setEditingRecord(null);
                setNewEntryData({});
              }}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <Plus size={20} />
                  </div>
                  New {moduleData?.name || 'Record'} Entry
                </h2>
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar w-full">
                {visibleTabs && visibleTabs.length > 0 && (
                  <div className="flex gap-2 mb-8 p-1.5 bg-zinc-100 dark:bg-zinc-950/50 rounded-2xl overflow-x-auto no-scrollbar">
                    {visibleTabs.map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                          activeTabId === tab.id
                            ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-xl shadow-indigo-500/5"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
                {moduleData?.layout ? (
                  <div className="grid grid-cols-12 gap-x-8 gap-y-8 w-full">
                    {(moduleData.layout || [])
                      .filter((field: ModuleField) => {
                        if (visibleTabs.length === 0) return true;
                        const firstTabId = visibleTabs[0]?.id;
                        const fieldTabId = field.tabId || firstTabId;
                        return fieldTabId === activeTabId;
                      })
                      .sort((a, b) => ((a.rowIndex || 0) - (b.rowIndex || 0)) || ((a.startCol || 0) - (b.startCol || 0)))
                      .map((field: ModuleField) => {
                        if (!isFieldVisible(field, newEntryData, { user })) return null;
                        
                        return (
                            <div 
                              key={field.id} 
                              className={cn(
                                "space-y-2",
                                field.colSpan === 1 ? "col-span-1" :
                                field.colSpan === 2 ? "col-span-2" :
                                field.colSpan === 3 ? "col-span-3" :
                                field.colSpan === 4 ? "col-span-4" :
                                field.colSpan === 5 ? "col-span-5" :
                                field.colSpan === 6 ? "col-span-6" :
                                field.colSpan === 7 ? "col-span-7" :
                                field.colSpan === 8 ? "col-span-8" :
                                field.colSpan === 9 ? "col-span-9" :
                                field.colSpan === 10 ? "col-span-10" :
                                field.colSpan === 11 ? "col-span-11" : "col-span-12"
                              )}
                              style={{
                                gridColumnStart: field.startCol ? field.startCol + 1 : 'auto',
                                gridRowStart: (field.rowIndex !== undefined) ? field.rowIndex + 1 : 'auto'
                              }}
                            >
                            {field.type === 'heading' ? (
                              <h4 className={cn(
                                "font-bold text-zinc-900 dark:text-white mt-2",
                                field.options?.[0] === 'h1' ? "text-2xl" :
                                field.options?.[0] === 'h3' ? "text-lg" :
                                field.options?.[0] === 'h4' ? "text-base" : "text-xl"
                              )}>{field.label}</h4>
                            ) : field.type === 'divider' ? (
                              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                            ) : field.type === 'spacer' ? (
                              <div className="w-full h-8" />
                            ) : field.type === 'alert' ? (
                              <div className={cn(
                                "p-4 rounded-xl border text-sm",
                                field.options?.[0] === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                field.options?.[0] === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                field.options?.[0] === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                              )}>
                                {field.label}
                              </div>
                            ) : ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested'].includes(field.type) ? (
                              <CollapsibleFieldGroup field={field}>
                                <div className="space-y-4">
                                  {(field.fields || []).map((nestedField: any) => {
                                    if (!isFieldVisible(nestedField, newEntryData[field.id] || {}, { user })) return null;
                                    return (
                                    <div key={nestedField.id} className="space-y-2">
                                      <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                        {nestedField.label}
                                        {nestedField.tooltip && (
                                          <div className="relative cursor-help">
                                            <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                              {nestedField.tooltip}
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                            </div>
                                          </div>
                                        )}
                                      </label>
                                      <FieldInput 
                                        field={nestedField}
                                        value={(() => {
                                          const val = newEntryData[field.id]?.[nestedField.id];
                                          if (val !== undefined) return val;
                                          return calculateDefaultValue(nestedField, newEntryData[field.id] || {});
                                        })()}
                                        onChange={(val, metadata) => handleFieldChange(nestedField.id, val, metadata)}
                                        recordData={newEntryData[field.id] || {}}
                                      />
                                    </div>
                                  )})}
                                </div>
                              </CollapsibleFieldGroup>
                            ) : field.type === 'repeatableGroup' ? (
                              <CollapsibleFieldGroup field={field} count={(newEntryData[field.id] || []).length}>
                                <RepeatableGroupBlock 
                                  field={field}
                                  value={newEntryData[field.id] || []}
                                  onChange={(val) => handleFieldChange(field.id, val)}
                                  hideHeader={true}
                                />
                              </CollapsibleFieldGroup>
                            ) : (
                              <>
                                <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 relative group/label">
                                  {field.label}
                                  {field.required && <span className="text-rose-500">*</span>}
                                  {field.tooltip && (
                                    <div className="relative cursor-help">
                                      <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                        {field.tooltip}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                      </div>
                                    </div>
                                  )}
                                </label>
                                  <FieldInput 
                                    field={field}
                                    value={(() => {
                                    const val = newEntryData[field.id];
                                    if (val !== undefined) return val;
                                    return calculateDefaultValue(field, newEntryData);
                                  })()}
                                    onChange={(val, metadata) => handleFieldChange(field.id, val, metadata)}
                                    recordData={newEntryData}
                                  />
                                {field.helperText && (
                                  <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">{field.helperText}</p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic">
                    No fields configured for this layout.
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4">
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateEntry}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <LucideIcons.Loader2 size={18} className="animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Create Entry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {recordToDelete && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <LucideIcons.AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Entry?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteEntry(recordToDelete)}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

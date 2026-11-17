import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  X, 
  Copy, 
  Check, 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  SlidersHorizontal,
  ChevronDown,
  Building,
  Shield,
  Tag,
  ExternalLink,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelLeft,
  PanelLeftClose,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { AuroraModal } from '../UI/AuroraModal';
import { Button } from '../UI/Primitives';
import { cn, formatLocalizedDate, getFieldValue, isFieldVisible } from '../../lib/utils';
import { ModuleField } from '../../types/platform';
import { UniversalNote } from '../../types/notes';
import { UniversalReminder } from '../../types/reminders';
import { ActivityEvent } from '../Platform/ActivityEventCard';
import { isFieldHiddenBySecurity, isFieldMaskedBySecurity, formatMaskedFieldValue } from '../../utils/fieldSecurity';
import { API_BASE_URL } from '../../config';
import { PartyProfileCardContext } from '../../context/PartyProfileCardContext';
import { useBrandKits } from '../../hooks/useBrandKits';
import { BrandKit } from '../../services/brandKitService';

export interface RecordPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  moduleId?: string;
  moduleData: any;
  allFields: ModuleField[];
  members?: any[];
  tenant?: any;
  currentUserName?: string;
  currentUser?: any;
  editData?: Record<string, any>;
  notes?: UniversalNote[];
  activities?: ActivityEvent[];
  tasks?: UniversalReminder[];
  lookupData?: Record<string, any[]>;
  brandKit?: BrandKit;
}

interface FormattedFieldItem {
  id: string;
  name?: string;
  label: string;
  type: string;
  value: any;
  formattedDisplay: React.ReactNode;
  textVal?: string;
  isEmpty: boolean;
  isMasked?: boolean;
  helperText?: string;
  colSpan?: number;
}

interface FieldGroupSection {
  id: string;
  title: string;
  description?: string;
  fields: FormattedFieldItem[];
}

interface TabSection {
  id: string;
  title: string;
  groups: FieldGroupSection[];
}

export const RecordPdfExportModal: React.FC<RecordPdfExportModalProps> = ({
  isOpen,
  onClose,
  record,
  moduleId,
  moduleData,
  allFields = [],
  members = [],
  tenant,
  currentUserName = 'Current User',
  currentUser,
  editData = {},
  notes: propNotes,
  activities: propActivities,
  tasks: _propTasks,
  lookupData = {},
  brandKit: propBrandKit
}) => {
  // Brand Builder Integration
  const { brandKits, defaultBrandKit, resolveBrandTokens } = useBrandKits();
  const initialBrandId = propBrandKit?.id || moduleData?.brandKitId || (moduleData?.config as any)?.brandKitId || defaultBrandKit?.id;
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(initialBrandId || null);

  // Sync initial brand if defaultBrandKit loads asynchronously
  useEffect(() => {
    if (!selectedBrandId && (defaultBrandKit?.id || initialBrandId)) {
      setSelectedBrandId(initialBrandId || defaultBrandKit?.id || null);
    }
  }, [defaultBrandKit?.id, initialBrandId, selectedBrandId]);

  const activeBrandKit = useMemo(() => {
    if (selectedBrandId) {
      const found = brandKits.find(b => b.id === selectedBrandId);
      if (found) return found;
    }
    return propBrandKit || defaultBrandKit || (brandKits.length > 0 ? brandKits[0] : null);
  }, [selectedBrandId, brandKits, propBrandKit, defaultBrandKit]);

  const brandTokens = resolveBrandTokens(activeBrandKit);
  const brand = activeBrandKit;

  const primaryColor = brand?.colors?.primary || brandTokens.primaryColor || '#2563EB';
  const secondaryColor = brand?.colors?.secondary || brandTokens.secondaryColor || '#0EA5E9';
  const accentColor = brand?.colors?.accent || brandTokens.accentColor || '#4F46E5';
  const headingFont = brand?.typography?.headingFont || brandTokens.headingFont || 'inherit';
  const bodyFont = brand?.typography?.bodyFont || brandTokens.bodyFont || 'inherit';
  const brandName = brand?.name || tenant?.name || 'Ashley Schaffer BMW';
  const tagline = brand?.voiceAndTone?.tagline || (tenant?.tagline) || 'Modern Platform Excellence';
  const brandLogo = brand?.assets?.logoDark || brand?.assets?.logoLight || brand?.assets?.iconMark || tenant?.logoUrl;
  const letterheadBanner = brand?.assets?.letterheadBanner;
  const website = brand?.emailDefaults?.socialLinks?.website || tenant?.website || 'https://aurora.platform';

  // Directory & Party Entity Context
  const partyProfileCtx = useContext(PartyProfileCardContext);
  const getPartySummary = partyProfileCtx?.getPartySummary;
  const directoryMap = partyProfileCtx?.directoryMap;

  // Resolved directory entity & party names
  const [resolvedEntities, setResolvedEntities] = useState<Record<string, { name: string; type?: string; code?: string }>>({});

  // Configurable export options
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeEmptyFields, setIncludeEmptyFields] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeActivity, setIncludeActivity] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  // Pages Sidebar & Zoom States
  const [showSidebar, setShowSidebar] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [wheelZoomDirect, setWheelZoomDirect] = useState(false);

  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const optionsDropdownRef = useRef<HTMLDivElement>(null);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  // Mouse wheel zoom handler (supports Ctrl+Wheel, Alt+Wheel, Meta+Wheel, or Direct Wheel Zoom)
  useEffect(() => {
    const canvas = canvasScrollRef.current;
    if (!canvas || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (wheelZoomDirect || e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        setZoom(prev => Math.min(Math.max(prev + delta, 40), 200));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, wheelZoomDirect]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(e.target as Node)) {
        setShowOptionsDropdown(false);
      }
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(e.target as Node)) {
        setShowZoomDropdown(false);
      }
    };
    if (showBrandDropdown || showOptionsDropdown || showZoomDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandDropdown, showOptionsDropdown, showZoomDropdown]);

  // Dynamic audit/notes state if not provided as props
  const [localNotes, setLocalNotes] = useState<UniversalNote[]>(propNotes || []);
  const [localActivities, setLocalActivities] = useState<ActivityEvent[]>(propActivities || []);

  const recordId = record?.id || '';
  const recordKey = record?._record_key || record?.id?.slice(0, 8) || 'RECORD';
  const dateFormat = tenant?.localization?.dateFormat || 'DD/MM/YYYY';

  // Fetch extra data (notes, activity) if not provided
  useEffect(() => {
    if (!isOpen || !recordId) return;

    if (!propNotes && !propActivities) {
      let isMounted = true;

      const fetchExtras = async () => {
        try {
          const promises: Promise<any>[] = [];
          
          // Fetch Audit/Activity
          promises.push(
            fetch(`${API_BASE_URL}/api/audit/${recordId}?order=desc`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => [])
          );

          const [auditData] = await Promise.all(promises);
          if (isMounted) {
            if (Array.isArray(auditData)) {
              setLocalActivities(auditData);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch record extras for PDF export:', e);
        }
      };

      fetchExtras();
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, recordId, propNotes, propActivities]);

  // Merge live edit data with record data
  const mergedData = useMemo(() => {
    return {
      ...(record?.data || {}),
      ...(record || {}),
      ...(editData || {})
    };
  }, [record, editData]);

  // Helper to determine if a field is a directory / party lookup field
  const isDirectoryEntityField = (field: ModuleField) => {
    return Boolean(
      field.type === 'party' ||
      field.targetPlatformModuleId === 'people-organisations' ||
      field.platformEntity === 'people-organisations' ||
      field.platformEntity === 'directory' ||
      field.id === 'directoryEntity' ||
      field.name === 'directoryEntity' ||
      (field.label && field.label.toLowerCase().includes('directory entity'))
    );
  };

  // Helper to synchronously derive party name from lookup output mappings if already mapped on the record
  const derivePartyNameFromMappings = (field: ModuleField, recordData: any): string | null => {
    const mappings = Array.isArray(field?.lookupOutputMappings) ? field.lookupOutputMappings : [];
    if (mappings.length === 0 || !recordData || typeof recordData !== 'object') return null;

    let first = '';
    let last = '';
    let legal = '';
    let full = '';
    for (const m of mappings) {
      const src = m.sourceField || m.sourceProperty;
      const tgt = m.targetFieldId || m.targetField;
      const val = tgt ? (recordData[tgt] ?? getFieldValue(recordData, tgt)) : undefined;
      if (!val || typeof val !== 'string') continue;
      if (src === 'firstName') first = val;
      else if (src === 'lastName') last = val;
      else if (src === 'legalName' || src === 'tradingName') legal = val;
      else if (src === 'displayName' || src === 'fullName' || src === 'name') full = val;
    }
    const derivedName = full || `${first} ${last}`.trim() || legal;
    return derivedName || null;
  };

  // Fetch any unresolved party / directory entity names
  useEffect(() => {
    if (!isOpen) return;

    const partyIdsToFetch = new Set<string>();

    allFields.forEach((field) => {
      const isDir = isDirectoryEntityField(field);
      const rawVal = getFieldValue(mergedData, field.id, field.name);
      if (!rawVal) return;

      if (typeof rawVal === 'string') {
        const isCuid = /^c[a-z0-9]{20,}$/i.test(rawVal);
        if (isDir || isCuid || field.type === 'party') {
          if (!resolvedEntities[rawVal]) {
            const summary = getPartySummary?.(rawVal) || directoryMap?.get(rawVal);
            if (summary) {
              setResolvedEntities((prev) => ({
                ...prev,
                [rawVal]: {
                  name: summary.displayName,
                  type: summary.partyType,
                  code: (summary as any).partyCode,
                },
              }));
            } else {
              partyIdsToFetch.add(rawVal);
            }
          }
        }
      }
    });

    if (partyIdsToFetch.size === 0) return;

    const token = (import.meta as any).env?.VITE_DEV_TOKEN || localStorage.getItem('aurora_token');
    const tenantId = tenant?.id || '';

    partyIdsToFetch.forEach((partyId) => {
      fetch(`${API_BASE_URL}/api/people-organisations/${encodeURIComponent(partyId)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const displayName =
            data.displayName ||
            (data.partyType === 'PERSON'
              ? `${data.person?.firstName || ''} ${data.person?.lastName || ''}`.trim()
              : data.organization?.legalName || data.organization?.tradingName) ||
            data.name ||
            'Unnamed Entity';

          setResolvedEntities((prev) => ({
            ...prev,
            [partyId]: {
              name: displayName,
              type: data.partyType,
              code: data.partyCode,
            },
          }));
        })
        .catch(() => {});
    });
  }, [isOpen, allFields, mergedData, tenant?.id, getPartySummary, directoryMap, resolvedEntities]);

  // Resolve metadata: Status, Assignee, Creator, Dates
  const recordMetadata = useMemo(() => {
    const currentStatus = mergedData?.status || record?.status || 'New';
    const assigneeId = mergedData?.assigneeId !== undefined ? mergedData.assigneeId : record?.assigneeId;
    const assignee = members.find(m => m.id === assigneeId || m.userId === assigneeId) || null;

    const creatorId = record?.createdBy || record?.created_by || record?.createdByMemberId || record?.createdByUserId;
    const creator = members.find(m => 
      m.id === creatorId || 
      m.userId === creatorId || 
      (m.email && creatorId && m.email.toLowerCase() === String(creatorId).toLowerCase())
    ) || (record?.createdByMember ? { name: record.createdByMember.name || record.createdByMember.email } : null);

    const createdDate = record?.createdAt || record?.created_at || null;
    const updatedDate = record?.updatedAt || record?.updated_at || null;
    const source = record?.source || record?.data?.source || mergedData?.source || null;

    const participantIds: string[] = Array.isArray(mergedData?.participantIds) 
      ? mergedData.participantIds 
      : (Array.isArray(record?.participantIds) ? record.participantIds : []);
    const participants = members.filter(m => participantIds.includes(m.id) || participantIds.includes(m.userId));

    return {
      status: currentStatus,
      assignee,
      creator,
      createdDate,
      updatedDate,
      source,
      participants
    };
  }, [mergedData, record, members]);

  // Format any field value into readable display
  const formatFieldValue = (field: ModuleField, rawVal: any): { display: React.ReactNode; isEmpty: boolean; textVal: string } => {
    if (isFieldMaskedBySecurity(field.id, moduleData, currentUser)) {
      const masked = formatMaskedFieldValue(rawVal);
      return { display: <span className="font-mono text-zinc-500">{masked}</span>, isEmpty: !rawVal, textVal: masked };
    }

    if (rawVal === undefined || rawVal === null || rawVal === '' || (Array.isArray(rawVal) && rawVal.length === 0)) {
      return { display: <span className="text-zinc-400 italic">None</span>, isEmpty: true, textVal: '—' };
    }

    // Directory / Party Entity Lookup Field Check
    const isDir = isDirectoryEntityField(field);

    if (isDir || field.type === 'party') {
      const partyId = typeof rawVal === 'string' ? rawVal : (rawVal?.id || '');
      const isCuid = typeof partyId === 'string' && /^c[a-z0-9]{20,}$/i.test(partyId);

      const summary = typeof rawVal === 'string' ? (getPartySummary?.(rawVal) || directoryMap?.get(rawVal)) : rawVal;
      const derived = derivePartyNameFromMappings(field, mergedData);
      const resolved = partyId ? resolvedEntities[partyId] : null;

      const entityName =
        summary?.displayName ||
        resolved?.name ||
        derived ||
        (typeof rawVal === 'object' && rawVal !== null ? (rawVal.displayName || rawVal.name || rawVal.label) : null) ||
        (isCuid ? null : (partyId || String(rawVal)));

      const partyType = summary?.partyType || resolved?.type || (derived ? 'PERSON' : undefined);
      const displayName = entityName || (isCuid ? 'Directory Entity' : partyId || String(rawVal));

      return {
        display: (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold border",
                partyType === 'ORGANIZATION'
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-sky-50 text-sky-700 border-sky-200"
              )}
            >
              {partyType === 'ORGANIZATION' ? <Building size={13} /> : <User size={13} />}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-zinc-900 text-xs truncate">{displayName}</span>
              {partyType && (
                <span className="text-[10px] text-zinc-400 font-medium capitalize">
                  {partyType === 'ORGANIZATION' ? 'Organisation' : 'Person'}
                </span>
              )}
            </div>
          </div>
        ),
        isEmpty: false,
        textVal: displayName
      };
    }

    switch (field.type) {
      case 'date': {
        const formatted = formatLocalizedDate(rawVal, dateFormat, false);
        return { 
          display: <span className="font-medium text-zinc-900">{formatted || String(rawVal)}</span>, 
          isEmpty: false, 
          textVal: formatted || String(rawVal) 
        };
      }
      case 'datetime':
      case 'timestamp': {
        const formatted = formatLocalizedDate(rawVal, dateFormat, true);
        return { 
          display: <span className="font-medium text-zinc-900">{formatted || String(rawVal)}</span>, 
          isEmpty: false, 
          textVal: formatted || String(rawVal) 
        };
      }
      case 'boolean':
      case 'checkbox': {
        const isTrue = rawVal === true || rawVal === 'true' || rawVal === 1 || rawVal === '1';
        return {
          display: (
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold",
              isTrue ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-600 border border-zinc-200"
            )}>
              {isTrue ? <CheckCircle2 size={12} className="text-emerald-600" /> : <AlertCircle size={12} className="text-zinc-400" />}
              <span>{isTrue ? 'Yes' : 'No'}</span>
            </span>
          ),
          isEmpty: false,
          textVal: isTrue ? 'Yes' : 'No'
        };
      }
      case 'currency': {
        const num = Number(rawVal);
        const formatted = !isNaN(num) 
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
          : String(rawVal);
        return {
          display: <span className="font-semibold text-zinc-900 font-mono">{formatted}</span>,
          isEmpty: false,
          textVal: formatted
        };
      }
      case 'percentage':
      case 'percent': {
        const str = `${rawVal}%`;
        return {
          display: <span className="font-semibold text-zinc-900 font-mono">{str}</span>,
          isEmpty: false,
          textVal: str
        };
      }
      case 'lookup': {
        if (typeof rawVal === 'object' && rawVal !== null) {
          const displayStr = rawVal.displayName || rawVal.name || rawVal.label || rawVal.title || JSON.stringify(rawVal);
          return {
            display: <span className="font-semibold text-zinc-900">{displayStr}</span>,
            isEmpty: false,
            textVal: displayStr
          };
        }

        let resolvedLabel: string | null = null;
        if (lookupData) {
          const targetKey = field.globalListName || field.id || (field as any).lookupSource;
          const list = targetKey ? lookupData[targetKey] : null;
          if (Array.isArray(list)) {
            const found = list.find((item: any) => item.id === rawVal || item.value === rawVal);
            if (found) {
              resolvedLabel = found.label || found.name || found.title || String(found.value);
            }
          }
        }

        if (!resolvedLabel && Array.isArray(field.options)) {
          const found = field.options.find((opt: any) => opt === rawVal || opt.value === rawVal || opt.id === rawVal);
          if (found) {
            resolvedLabel = typeof found === 'object' ? (found.label || found.name || found.value) : String(found);
          }
        }

        const isDir = isDirectoryEntityField(field);
        const isCuid = typeof rawVal === 'string' && /^c[a-z0-9]{20,}$/i.test(rawVal);

        if (!resolvedLabel && typeof rawVal === 'string' && (isDir || isCuid || field.type === 'party')) {
          const sum = getPartySummary?.(rawVal) || directoryMap?.get(rawVal) || resolvedEntities[rawVal];
          if (sum) {
            resolvedLabel = sum.displayName || sum.name;
          }
        }

        const finalStr = resolvedLabel || (isCuid ? 'Linked Record' : String(rawVal));

        return {
          display: <span className="font-semibold text-zinc-900">{finalStr}</span>,
          isEmpty: false,
          textVal: finalStr
        };
      }
      case 'select':
      case 'dropdown':
      case 'status':
      case 'choice':
      case 'radio': {
        let labelStr = String(rawVal);
        if (Array.isArray(field.options)) {
          const opt = field.options.find((o: any) => o === rawVal || o.value === rawVal || o.id === rawVal);
          if (opt) {
            labelStr = typeof opt === 'object' ? (opt.label || opt.name || opt.value || labelStr) : String(opt);
          }
        } else if (field.globalListName && lookupData?.[field.globalListName]) {
          const list = lookupData[field.globalListName];
          const item = list.find((i: any) => i.id === rawVal || i.value === rawVal);
          if (item) {
            labelStr = item.label || item.name || item.value || labelStr;
          }
        }
        return {
          display: (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
              {labelStr}
            </span>
          ),
          isEmpty: false,
          textVal: labelStr
        };
      }
      case 'multiselect':
      case 'tags': {
        const items = Array.isArray(rawVal) ? rawVal : [rawVal];
        return {
          display: (
            <div className="flex flex-wrap gap-1">
              {items.map((item: any, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200">
                  {String(item)}
                </span>
              ))}
            </div>
          ),
          isEmpty: items.length === 0,
          textVal: items.map(String).join(', ')
        };
      }
      case 'user':
      case 'member': {
        const member = members.find(m => m.id === rawVal || m.userId === rawVal || m.email === rawVal);
        const name = member?.name || member?.email || String(rawVal);
        return {
          display: (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-zinc-900">{name}</span>
            </div>
          ),
          isEmpty: false,
          textVal: name
        };
      }
      case 'textarea':
      case 'richtext': {
        const text = String(rawVal);
        return {
          display: (
            <div className="whitespace-pre-wrap text-zinc-800 leading-relaxed text-xs bg-zinc-50/70 p-2.5 rounded-lg border border-zinc-200/80">
              {text}
            </div>
          ),
          isEmpty: false,
          textVal: text
        };
      }
      case 'repeatableGroup': {
        if (!Array.isArray(rawVal) || rawVal.length === 0) {
          return { display: <span className="text-zinc-400 italic">No entries</span>, isEmpty: true, textVal: 'No entries' };
        }
        const subFields = field.fields || [];
        return {
          display: (
            <div className="border border-zinc-200 rounded-lg overflow-hidden mt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100/80 border-b border-zinc-200 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-1.5 px-3 w-8 text-center text-zinc-400">#</th>
                    {subFields.map(sf => (
                      <th key={sf.id} className="py-1.5 px-3">{sf.label || sf.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rawVal.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-zinc-50/50' : 'bg-white'}>
                      <td className="py-1.5 px-3 text-center text-zinc-400 text-[10px]">{rIdx + 1}</td>
                      {subFields.map(sf => {
                        const cellVal = row?.[sf.id] ?? row?.[sf.name || ''];
                        return (
                          <td key={sf.id} className="py-1.5 px-3 text-zinc-800">
                            {cellVal !== undefined && cellVal !== null ? String(cellVal) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
          isEmpty: false,
          textVal: `${rawVal.length} entries`
        };
      }
      default: {
        let displayStr = '';
        if (typeof rawVal === 'object') {
          displayStr = rawVal.displayName || rawVal.name || rawVal.label || rawVal.title || rawVal.entityName || JSON.stringify(rawVal);
        } else {
          const strVal = String(rawVal);
          if (/^c[a-z0-9]{20,}$/i.test(strVal)) {
            const sum = getPartySummary?.(strVal) || directoryMap?.get(strVal) || resolvedEntities[strVal];
            if (sum) {
              displayStr = sum.displayName || sum.name;
            } else {
              displayStr = strVal;
            }
          } else {
            displayStr = strVal;
          }
        }
        return {
          display: <span className="text-zinc-900 font-medium">{displayStr}</span>,
          isEmpty: false,
          textVal: displayStr
        };
      }
    }
  };

  // Organize fields into Tab -> Group hierarchy
  const tabSections = useMemo((): TabSection[] => {
    if (!moduleData) return [];

    const editForm = (moduleData as any)?.forms?.find((f: any) => f.usage === 'workspace_edit') || 
      ((moduleData as any)?.forms?.length === 1 ? (moduleData as any).forms[0] : null);

    const visibilityContext = {
      user: currentUser,
      tenant
    };

    // Case 1: Structured Form with steps or fields
    if (editForm) {
      if (editForm.isMultistep && editForm.steps && editForm.steps.length > 0) {
        return editForm.steps.map((step: any): TabSection => {
          const stepFields: FormattedFieldItem[] = [];
          (step.fields || []).forEach((fObj: any) => {
            if (fObj.id.startsWith('visual-')) return;
            if (isFieldHiddenBySecurity(fObj.id, moduleData, currentUser)) return;
            if (!isFieldVisible(fObj, mergedData, visibilityContext)) return;

            const fieldDef = allFields.find(f => f.id === fObj.id);
            if (!fieldDef) return;

            const val = getFieldValue(mergedData, fieldDef.id, fieldDef.name);
            const { display, isEmpty, textVal } = formatFieldValue(fieldDef, val);

            stepFields.push({
              id: fieldDef.id,
              name: fieldDef.name,
              label: fObj.labelOverride || fieldDef.label || fieldDef.name || fieldDef.id,
              type: fieldDef.type,
              value: val,
              formattedDisplay: display,
              textVal,
              isEmpty,
              helperText: fieldDef.helperText,
              colSpan: fieldDef.colSpan
            });
          });

          return {
            id: step.id,
            title: step.title || step.label || 'Step',
            groups: [
              {
                id: `${step.id}_group`,
                title: step.title || 'General Details',
                description: step.description,
                fields: stepFields
              }
            ]
          };
        });
      }
    }

    // Case 2: Standard Module Tabs and Layout
    const rawTabs = moduleData.tabs && moduleData.tabs.length > 0
      ? moduleData.tabs.filter((t: any) => isFieldVisible(t, mergedData, visibilityContext))
      : [{ id: 'default', label: 'General Information' }];

    const layout = moduleData.layout || [];

    return rawTabs.map((tab: any): TabSection => {
      const tabId = tab.id;
      const groups: FieldGroupSection[] = [];
      const ungroupedFields: FormattedFieldItem[] = [];

      // Filter layout items that belong to this tab
      const tabLayoutItems = layout.filter((item: any) => {
        const itemTabId = item.tabId || rawTabs[0]?.id || 'default';
        return itemTabId === tabId;
      });

      tabLayoutItems.forEach((item: any) => {
        if (isFieldHiddenBySecurity(item.id, moduleData, currentUser)) return;
        if (!isFieldVisible(item, mergedData, visibilityContext)) return;

        // Container items: fieldGroup, card, group, accordion, etc.
        if (['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(item.type)) {
          const groupFields: FormattedFieldItem[] = [];
          (item.fields || []).forEach((nested: ModuleField) => {
            if (isFieldHiddenBySecurity(nested.id, moduleData, currentUser)) return;
            if (!isFieldVisible(nested, mergedData, visibilityContext)) return;

            const val = getFieldValue(mergedData, nested.id, nested.name);
            const { display, isEmpty, textVal } = formatFieldValue(nested, val);

            groupFields.push({
              id: nested.id,
              name: nested.name,
              label: nested.label || nested.name || nested.id,
              type: nested.type,
              value: val,
              formattedDisplay: display,
              textVal,
              isEmpty,
              helperText: nested.helperText,
              colSpan: nested.colSpan
            });
          });

          if (groupFields.length > 0) {
            groups.push({
              id: item.id,
              title: item.label || item.name || 'Section Details',
              description: item.helperText,
              fields: groupFields
            });
          }
        } else if (item.type === 'repeatableGroup') {
          // Repeatable group as its own group section
          const val = getFieldValue(mergedData, item.id, item.name);
          const { display, isEmpty, textVal } = formatFieldValue(item, val);
          groups.push({
            id: item.id,
            title: item.label || item.name || 'Repeatable Items',
            description: item.helperText,
            fields: [
              {
                id: item.id,
                name: item.name,
                label: item.label,
                type: item.type,
                value: val,
                formattedDisplay: display,
                textVal,
                isEmpty,
                colSpan: 12
              }
            ]
          });
        } else if (!['heading', 'divider', 'spacer', 'alert'].includes(item.type)) {
          // Regular ungrouped field
          const val = getFieldValue(mergedData, item.id, item.name);
          const { display, isEmpty, textVal } = formatFieldValue(item, val);

          ungroupedFields.push({
            id: item.id,
            name: item.name,
            label: item.label || item.name || item.id,
            type: item.type,
            value: val,
            formattedDisplay: display,
            textVal,
            isEmpty,
            helperText: item.helperText,
            colSpan: item.colSpan
          });
        }
      });

      // If there are ungrouped fields, place them in a primary section
      if (ungroupedFields.length > 0) {
        groups.unshift({
          id: `${tabId}_general`,
          title: tab.label || 'General Details',
          fields: ungroupedFields
        });
      }

      return {
        id: tabId,
        title: tab.label || 'General',
        groups
      };
    });
  }, [moduleData, allFields, mergedData, currentUser, tenant, dateFormat, resolvedEntities, directoryMap, lookupData]);

  // Filtered tab sections based on visibility
  const visibleTabSections = useMemo(() => {
    return tabSections.map(tab => ({
      ...tab,
      groups: tab.groups.map(group => ({
        ...group,
        fields: group.fields.filter(f => includeEmptyFields || !f.isEmpty)
      })).filter(group => group.fields.length > 0)
    })).filter(tab => tab.groups.length > 0);
  }, [tabSections, includeEmptyFields]);

  // Page item interface for deterministic pagination
  interface PageItem {
    id: string;
    type: 'group' | 'notes' | 'activity';
    tabTitle?: string;
    showTabHeader?: boolean;
    group?: FieldGroupSection;
    estimatedHeight: number;
  }

  interface DocumentPage {
    pageNumber: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    items: PageItem[];
  }

  // Calculate discrete A4 pages
  const documentPages = useMemo<DocumentPage[]>(() => {
    const allItems: PageItem[] = [];

    // 1. Gather all groups from visible tabs
    visibleTabSections.forEach((tab) => {
      tab.groups.forEach((group, groupIdx) => {
        let fieldHeight = 0;
        let pendingColSpan = 0;

        group.fields.forEach(field => {
          const isFull = field.colSpan === 12 || field.type === 'textarea' || field.type === 'richtext' || field.type === 'repeatableGroup';
          if (isFull) {
            if (pendingColSpan > 0) {
              fieldHeight += 44;
              pendingColSpan = 0;
            }
            if (field.type === 'repeatableGroup') {
              fieldHeight += 95;
            } else if (field.type === 'textarea' || field.type === 'richtext') {
              fieldHeight += 80;
            } else {
              fieldHeight += 50;
            }
          } else {
            pendingColSpan += 6;
            if (pendingColSpan >= 12) {
              fieldHeight += 44;
              pendingColSpan = 0;
            }
          }
        });

        if (pendingColSpan > 0) {
          fieldHeight += 44;
        }

        const showTabHeader = visibleTabSections.length > 1 && groupIdx === 0;
        const totalEstimated = fieldHeight + 45 + (showTabHeader ? 35 : 0) + (group.description ? 20 : 0);

        allItems.push({
          id: group.id,
          type: 'group',
          tabTitle: tab.title,
          showTabHeader,
          group,
          estimatedHeight: totalEstimated
        });
      });
    });

    // 2. Notes
    const hasNotes = includeNotes && (localNotes.length > 0 || (propNotes && propNotes.length > 0));
    if (hasNotes) {
      const notesList = propNotes || localNotes;
      const notesHeight = 50 + Math.min(notesList.length, 10) * 55;
      allItems.push({
        id: 'section_notes',
        type: 'notes',
        estimatedHeight: notesHeight
      });
    }

    // 3. Activity
    const hasActivity = includeActivity && (localActivities.length > 0 || (propActivities && propActivities.length > 0));
    if (hasActivity) {
      const actList = (propActivities || localActivities).slice(0, 8);
      const actHeight = 45 + actList.length * 28;
      allItems.push({
        id: 'section_activity',
        type: 'activity',
        estimatedHeight: actHeight
      });
    }

    // Page 1 budget: ~1040px total printable height minus letterhead, metadata and margins
    const page1HeaderHeight = (letterheadBanner ? 100 : 0) + 160 + (includeMetadata ? 150 : 0) + 70;
    const page1Budget = Math.max(300, 1040 - page1HeaderHeight);
    const subsequentPageBudget = 900;

    const pages: DocumentPage[] = [];
    let currentItems: PageItem[] = [];
    let currentHeight = 0;
    let budget = page1Budget;

    for (const item of allItems) {
      if (currentItems.length > 0 && currentHeight + item.estimatedHeight > budget) {
        pages.push({
          pageNumber: pages.length + 1,
          isFirstPage: pages.length === 0,
          isLastPage: false,
          items: currentItems
        });
        currentItems = [item];
        budget = subsequentPageBudget;
        currentHeight = item.estimatedHeight;
      } else {
        currentItems.push(item);
        currentHeight += item.estimatedHeight;
      }
    }

    pages.push({
      pageNumber: pages.length + 1,
      isFirstPage: pages.length === 0,
      isLastPage: true,
      items: currentItems
    });

    if (pages.length > 0) {
      pages[pages.length - 1].isLastPage = true;
    }

    return pages;
  }, [
    visibleTabSections, 
    includeNotes, 
    propNotes, 
    localNotes, 
    includeActivity, 
    propActivities, 
    localActivities, 
    letterheadBanner, 
    includeMetadata
  ]);

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 40));
  const handleResetZoom = () => setZoom(100);

  // Scroll to selected page from sidebar
  const handleScrollToPage = (pageNum: number) => {
    setActivePage(pageNum);
    const target = document.getElementById(`record-page-${pageNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sync active page indicator as user scrolls the canvas
  const handleCanvasScroll = () => {
    if (!canvasScrollRef.current) return;
    const container = canvasScrollRef.current;
    const scrollTop = container.scrollTop;
    const midY = scrollTop + container.clientHeight / 3;

    for (const page of documentPages) {
      const el = document.getElementById(`record-page-${page.pageNumber}`);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (midY >= top && midY <= bottom) {
          setActivePage(page.pageNumber);
          break;
        }
      }
    }
  };

  // Handle Triggering Isolated Clean Multi-Page Print
  const handlePrint = () => {
    try {
      // Create hidden iframe for isolated clean printing
      const iframe = document.createElement('iframe');
      iframe.setAttribute('style', 'position: fixed; width: 0px; height: 0px; left: -9999px; top: -9999px; border: 0;');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      // Collect all document styles and fonts from head
      const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      const pagesHtml = documentPages.map(page => {
        const pageEl = document.getElementById(`record-page-${page.pageNumber}`);
        return `
          <div class="record-page-sheet" style="page-break-after: ${page.isLastPage ? 'avoid' : 'always'}; break-after: ${page.isLastPage ? 'avoid' : 'page'};">
            ${pageEl ? pageEl.innerHTML : ''}
          </div>
        `;
      }).join('\n');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>${brandName} - ${recordKey} Overview</title>
            ${headStyles}
            <style>
              @page {
                size: A4 portrait;
                margin: 10mm 12mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #111827 !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                min-height: 100% !important;
                overflow: visible !important;
                font-family: ${bodyFont !== 'inherit' ? `"${bodyFont}", ui-sans-serif, system-ui, sans-serif` : 'ui-sans-serif, system-ui, sans-serif'} !important;
              }
              .record-page-sheet {
                width: 100% !important;
                max-width: 100% !important;
                background: #ffffff !important;
                color: #111827 !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                min-height: 100vh !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
              .print-avoid-break {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            </style>
          </head>
          <body style="background: #ffffff !important; background-color: #ffffff !important; margin: 0; padding: 0;">
            ${pagesHtml}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }, 350);
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
      window.print();
    }
  };

  // Copy plain text summary to clipboard
  const handleCopySummary = () => {
    let text = `========================================\n`;
    text += `${tenant?.name || 'Aurora Platform'} - Record Overview\n`;
    text += `Record: ${recordKey} | Module: ${moduleData?.name || moduleData?.title || 'Module'}\n`;
    text += `Status: ${recordMetadata.status} | Assignee: ${recordMetadata.assignee?.name || 'Unassigned'}\n`;
    text += `Created: ${formatLocalizedDate(recordMetadata.createdDate, dateFormat, true)} by ${recordMetadata.creator?.name || 'System'}\n`;
    text += `========================================\n\n`;

    tabSections.forEach(tab => {
      text += `[TAB: ${tab.title.toUpperCase()}]\n`;
      tab.groups.forEach(group => {
        text += `\n--- ${group.title} ---\n`;
        group.fields.forEach(f => {
          if (!includeEmptyFields && f.isEmpty) return;
          const val = f.textVal || (f.value !== undefined && f.value !== null ? String(f.value) : '—');
          text += `${f.label}: ${val}\n`;
        });
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    toast.success('Record summary copied to clipboard');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Single Page Renderer (used for screen pages, thumbnail previews, and print sheets)
  const renderSinglePage = (page: DocumentPage, totalPages: number, _isThumbnail: boolean = false) => {
    return (
      <div className="flex-1 flex flex-col justify-between h-full space-y-6">
        <div className="space-y-6">
          {/* Page 1: Official Letterhead Banner, Header & Metadata */}
          {page.isFirstPage ? (
            <>
              {letterheadBanner && (
                <div className="w-full mb-6 rounded-xl overflow-hidden max-h-28 print-avoid-break">
                  <img src={letterheadBanner} alt={brandName} className="w-full h-full object-cover object-center" />
                </div>
              )}

              {/* Document Header (Letterhead format from Brand Builder) */}
              <div 
                className="border-b-2 pb-5 mb-6 flex items-start justify-between print-avoid-break gap-4"
                style={{ borderColor: primaryColor }}
              >
                <div className="space-y-1.5 min-w-0 pr-2">
                  <div className="space-y-0.5">
                    <h2 
                      className="text-base sm:text-lg font-black tracking-tight"
                      style={{ 
                        fontFamily: headingFont !== 'inherit' ? `"${headingFont}", sans-serif` : undefined,
                        color: primaryColor 
                      }}
                    >
                      {brandName.toUpperCase()}
                    </h2>
                    {tagline && (
                      <p className="text-[11px] text-zinc-500 font-medium">
                        {tagline}
                      </p>
                    )}
                  </div>

                  <div className="pt-1.5">
                    <h1 
                      className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight"
                      style={{ fontFamily: headingFont !== 'inherit' ? `"${headingFont}", sans-serif` : undefined }}
                    >
                      {moduleData?.name || moduleData?.title || 'Record'} Overview
                    </h1>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      Official structured document summary • Generated via Aurora System
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-2 shrink-0 flex flex-col items-end">
                  {brandLogo ? (
                    <img src={brandLogo} alt={brandName} className="h-8 sm:h-9 w-auto max-w-[150px] object-contain" />
                  ) : (
                    <div 
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {brandName.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div 
                    className="inline-block px-3 py-1 text-white rounded-lg font-mono font-bold text-xs tracking-wider shadow-2xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {recordKey}
                  </div>

                  <div className="text-right text-[11px] text-zinc-500 space-y-0.5 font-medium">
                    <p>Date: {formatLocalizedDate(new Date(), dateFormat, true)}</p>
                    <p className="text-[10px] text-zinc-400">Exported by: {currentUserName}</p>
                  </div>
                </div>
              </div>

              {/* Executive Metadata & Status Bar */}
              {includeMetadata && (
                <div 
                  className="mb-6 p-4 rounded-xl bg-zinc-50/70 border print-avoid-break"
                  style={{ borderColor: `${primaryColor}25` }}
                >
                  <h2 
                    className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                    style={{ color: primaryColor }}
                  >
                    <Info size={12} style={{ color: primaryColor }} />
                    <span>Executive Record Metadata</span>
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Status</span>
                      <div>
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                          style={{ 
                            backgroundColor: `${primaryColor}12`, 
                            color: primaryColor, 
                            borderColor: `${primaryColor}30` 
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                          {recordMetadata.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Assignee</span>
                      <div className="font-semibold text-zinc-800 flex items-center gap-1.5">
                        <User size={12} className="text-zinc-400" />
                        <span>{recordMetadata.assignee?.name || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Created</span>
                      <div className="text-zinc-800 font-medium">
                        {formatLocalizedDate(recordMetadata.createdDate, dateFormat, true) || '—'}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        by {recordMetadata.creator?.name || 'System'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Last Updated</span>
                      <div className="text-zinc-800 font-medium">
                        {formatLocalizedDate(recordMetadata.updatedDate, dateFormat, true) || '—'}
                      </div>
                      {recordMetadata.source && (
                        <div className="text-[10px] text-zinc-500">
                          via {recordMetadata.source}
                        </div>
                      )}
                    </div>
                  </div>

                  {recordMetadata.participants && recordMetadata.participants.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-200/80 flex items-center gap-2 text-xs">
                      <Users size={12} className="text-zinc-400 shrink-0" />
                      <span className="text-zinc-500 font-medium">Participants:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {recordMetadata.participants.map(p => (
                          <span key={p.id} className="px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700 text-[11px] font-medium">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Subsequent Page Running Header */
            <div 
              className="border-b-2 pb-3 mb-6 flex items-center justify-between gap-4 shrink-0 print-avoid-break"
              style={{ borderColor: primaryColor }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName} className="h-6 w-auto max-w-[100px] object-contain shrink-0" />
                ) : (
                  <div 
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {brandName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 
                    className="text-xs font-black tracking-tight truncate"
                    style={{ 
                      fontFamily: headingFont !== 'inherit' ? `"${headingFont}", sans-serif` : undefined,
                      color: primaryColor 
                    }}
                  >
                    {brandName.toUpperCase()}
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-medium truncate">
                    {moduleData?.name || moduleData?.title || 'Record'} Overview • {recordKey}
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] text-zinc-400 font-mono font-medium shrink-0">
                Page {page.pageNumber} of {totalPages}
              </div>
            </div>
          )}

          {/* Page Content Items */}
          <div className="space-y-5">
            {page.items.map((item) => {
              if (item.type === 'group' && item.group) {
                const group = item.group;
                return (
                  <div key={item.id} className="space-y-3 print-avoid-break">
                    {item.showTabHeader && (
                      <div 
                        className="pt-1 pb-1 border-b flex items-center gap-2 print-header-break"
                        style={{ borderColor: `${primaryColor}30` }}
                      >
                        <Layers size={13} style={{ color: primaryColor }} />
                        <h2 
                          className="text-xs font-black uppercase tracking-wider"
                          style={{ 
                            fontFamily: headingFont !== 'inherit' ? `"${headingFont}", sans-serif` : undefined,
                            color: primaryColor 
                          }}
                        >
                          {item.tabTitle}
                        </h2>
                      </div>
                    )}

                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-3">
                      <div className="border-b border-zinc-100 pb-2">
                        <h3 
                          className="text-xs font-bold uppercase tracking-wider text-zinc-800"
                          style={{ fontFamily: headingFont !== 'inherit' ? `"${headingFont}", sans-serif` : undefined }}
                        >
                          {group.title}
                        </h3>
                        {group.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">{group.description}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                        {group.fields.map(field => {
                          const isFullWidth = field.colSpan === 12 || field.type === 'textarea' || field.type === 'richtext' || field.type === 'repeatableGroup';
                          return (
                            <div 
                              key={field.id} 
                              className={cn(
                                "space-y-1",
                                isFullWidth ? "col-span-1 sm:col-span-2" : "col-span-1"
                              )}
                            >
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                                {field.label}
                              </span>
                              <div>
                                {field.formattedDisplay}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.type === 'notes') {
                const notesList = propNotes || localNotes;
                return (
                  <div key="notes_block" className="mt-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 print-avoid-break space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                      <FileText size={13} style={{ color: primaryColor }} />
                      <span>Internal Notes & Remarks</span>
                    </h3>
                    <div className="space-y-2">
                      {notesList.map((note, idx) => (
                        <div key={note.id || idx} className="p-2.5 rounded-lg bg-white border border-zinc-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-500">
                            <span className="font-semibold text-zinc-700">{note.authorName || 'Staff'}</span>
                            <span>{formatLocalizedDate(note.createdAt, dateFormat, true)}</span>
                          </div>
                          <p className="text-zinc-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (item.type === 'activity') {
                const actList = (propActivities || localActivities).slice(0, 8);
                return (
                  <div key="activity_block" className="mt-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 print-avoid-break space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                      <Clock size={13} style={{ color: primaryColor }} />
                      <span>Recent Audit Trail</span>
                    </h3>
                    <div className="space-y-1.5">
                      {actList.map((act, idx) => (
                        <div key={act.id || idx} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            <span className="font-medium text-zinc-800">{act.action || act.title || 'Event'}</span>
                            <span className="text-zinc-500 text-[11px]">— {act.actor?.name || 'System'}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatLocalizedDate(act.timestamp || act.createdAt, dateFormat, true)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Running Document Footer */}
        <div className="mt-8 pt-3 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400 shrink-0 print-avoid-break">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-600">{website}</span>
            <span>•</span>
            <span>Confidential & Proprietary</span>
          </div>
          <div>
            <span>Record Key: {recordKey} • {brandName} • Page {page.pageNumber} of {totalPages}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AuroraModal
        isOpen={isOpen}
        onClose={onClose}
        className="max-w-5xl lg:max-w-6xl w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col h-[92vh] text-zinc-900 dark:text-zinc-100"
      >
        {/* Print Stylesheet: isolates #record-print-portal on document.body, hides app & modal */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            html, body {
              background: #ffffff !important;
              color: #111827 !important;
              font-size: 10pt !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              height: auto !important;
              min-height: 100% !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }

            .fixed,
            [class*="fixed"],
            [class*="backdrop-blur"],
            [class*="bg-black"],
            [class*="bg-zinc-950"],
            [class*="bg-zinc-900"],
            .no-print {
              background: #ffffff !important;
              background-color: #ffffff !important;
              backdrop-filter: none !important;
              box-shadow: none !important;
              border: none !important;
            }

            .no-print {
              display: none !important;
              visibility: hidden !important;
            }

            #record-print-portal {
              display: block !important;
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #111827 !important;
              overflow: visible !important;
            }

            #record-print-portal * {
              visibility: visible !important;
            }

            .record-page-sheet {
              width: 100% !important;
              max-width: 100% !important;
              background: #ffffff !important;
              color: #111827 !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              min-height: 100vh !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-after: always !important;
              break-after: page !important;
            }

            .record-page-sheet:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            .print-avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .print-header-break {
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
          }
        ` }} />

        {/* Top Modal Controls (Screen Only) */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between shrink-0 no-print gap-3">
          {/* Left Group: Sidebar Toggle + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className={cn(
                "h-8 w-8 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-[0.96]",
                showSidebar 
                  ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700" 
                  : "bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title={showSidebar ? "Hide Pages Sidebar" : "Show Pages Sidebar"}
            >
              {showSidebar ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>

            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>

            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-2">
                <h3 className="text-zinc-900 dark:text-white font-bold text-sm tracking-tight truncate">Export Record Overview</h3>
                <span 
                  className="font-mono text-[11px] px-1.5 py-0.5 rounded font-bold border shrink-0"
                  style={{ 
                    color: primaryColor, 
                    backgroundColor: `${primaryColor}18`, 
                    borderColor: `${primaryColor}35` 
                  }}
                >
                  {recordKey}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Formatted, printable document summary ready for export
              </p>
            </div>
          </div>

          {/* Right Group: Zoom Controls + Brand Profile + Options + Export Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom Controls Pill */}
            <div className="relative flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 overflow-visible shadow-2xs" ref={zoomDropdownRef}>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="h-8 px-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer rounded-l-lg"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>

              <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />

              <button
                type="button"
                onClick={() => {
                  setShowZoomDropdown(!showZoomDropdown);
                  setShowBrandDropdown(false);
                  setShowOptionsDropdown(false);
                }}
                className="h-8 px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors flex items-center gap-1 cursor-pointer select-none"
                title="Zoom Options"
              >
                <span>{zoom}%</span>
                <ChevronDown size={10} className={cn("text-zinc-400 transition-transform duration-200", showZoomDropdown && "rotate-180")} />
              </button>

              <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 150}
                className="h-8 px-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>

              <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />

              <button
                type="button"
                onClick={handleResetZoom}
                className="h-8 px-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors cursor-pointer rounded-r-lg"
                title="Reset to 100%"
              >
                <Maximize2 size={12} />
              </button>

              {/* Zoom Presets Dropdown */}
              {showZoomDropdown && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                    Zoom Presets
                  </div>
                  {[
                    { label: '50%', value: 50 },
                    { label: '75%', value: 75 },
                    { label: '90%', value: 90 },
                    { label: '100% (Default)', value: 100 },
                    { label: '125%', value: 125 },
                    { label: '150%', value: 150 },
                    { label: '175%', value: 175 },
                    { label: '200%', value: 200 },
                    { label: 'Fit Width (85%)', value: 85 },
                    { label: 'Fit Page (65%)', value: 65 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setZoom(preset.value);
                        setShowZoomDropdown(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer",
                        zoom === preset.value
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold"
                          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <span>{preset.label}</span>
                      {zoom === preset.value && <Check size={12} className="text-emerald-500 shrink-0" />}
                    </button>
                  ))}

                  <div className="pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setWheelZoomDirect(!wheelZoomDirect)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    >
                      <span>Direct wheel zoom</span>
                      <input
                        type="checkbox"
                        checked={wheelZoomDirect}
                        onChange={(e) => setWheelZoomDirect(e.target.checked)}
                        className="rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Brand Switcher Pill Dropdown */}
            {(brandKits.length > 0 || brand) && (
              <div className="relative" ref={brandDropdownRef}>
                <button
                  type="button"
                  disabled={brandKits.length <= 1}
                  onClick={() => {
                    if (brandKits.length > 1) {
                      setShowBrandDropdown(!showBrandDropdown);
                      setShowOptionsDropdown(false);
                      setShowZoomDropdown(false);
                    }
                  }}
                  className={cn(
                    "h-8 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 select-none shadow-2xs",
                    "bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80",
                    brandKits.length > 1 
                      ? "hover:bg-zinc-100 dark:hover:bg-zinc-700/80 hover:text-zinc-900 dark:hover:text-white cursor-pointer active:scale-[0.98]" 
                      : "cursor-default opacity-90"
                  )}
                  title={brandKits.length > 1 ? "Switch Brand Profile" : `Active Brand: ${brandName}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="max-w-[110px] sm:max-w-[130px] truncate">{brandName}</span>
                  {brandKits.length > 1 && (
                    <ChevronDown size={11} className={cn("text-zinc-400 dark:text-zinc-500 transition-transform duration-200", showBrandDropdown && "rotate-180")} />
                  )}
                </button>

                {showBrandDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                      <span>Brand Identity</span>
                      <span className="text-[9px] text-zinc-400 font-normal">{brandKits.length} kits</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {brandKits.map((b) => {
                        const isSelected = (brand?.id === b.id) || (selectedBrandId === b.id);
                        const bPrimary = b.colors?.primary || '#2563EB';
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBrandId(b.id);
                              setShowBrandDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer",
                              isSelected
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold"
                                : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                                style={{ backgroundColor: bPrimary }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">{b.name}</span>
                                {b.voiceAndTone?.tagline && (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate font-normal">
                                    {b.voiceAndTone.tagline}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {b.isDefault && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/30">
                                  Default
                                </span>
                              )}
                              {isSelected && <Check size={13} className="text-emerald-500 dark:text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Options Dropdown */}
            <div className="relative" ref={optionsDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowOptionsDropdown(!showOptionsDropdown);
                  setShowBrandDropdown(false);
                  setShowZoomDropdown(false);
                }}
                className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-medium border border-zinc-200 dark:border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs select-none active:scale-[0.98]"
              >
                <SlidersHorizontal size={13} className="text-zinc-400" />
                <span className="hidden sm:inline">Options</span>
                <ChevronDown size={11} className={cn("text-zinc-400 dark:text-zinc-500 transition-transform duration-200", showOptionsDropdown && "rotate-180")} />
              </button>

              {showOptionsDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  {brandKits.length > 1 && (
                    <div className="mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 flex items-center justify-between">
                        <span>Brand Profile</span>
                      </div>
                      <div className="space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {brandKits.map((b) => {
                          const isSelected = (brand?.id === b.id) || (selectedBrandId === b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setSelectedBrandId(b.id)}
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer",
                                isSelected
                                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold"
                                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: b.colors?.primary || '#2563EB' }}
                                />
                                <span className="truncate">{b.name}</span>
                              </div>
                              {isSelected && <Check size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                    Export Configuration
                  </div>
                  <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">
                    <span>System Metadata</span>
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">
                    <span>Empty Fields</span>
                    <input
                      type="checkbox"
                      checked={includeEmptyFields}
                      onChange={(e) => setIncludeEmptyFields(e.target.checked)}
                      className="rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">
                    <span>Internal Notes</span>
                    <input
                      type="checkbox"
                      checked={includeNotes}
                      onChange={(e) => setIncludeNotes(e.target.checked)}
                      className="rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors">
                    <span>Audit Activity</span>
                    <input
                      type="checkbox"
                      checked={includeActivity}
                      onChange={(e) => setIncludeActivity(e.target.checked)}
                      className="rounded bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Copy Summary Text */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-medium border border-zinc-200 dark:border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs select-none active:scale-[0.98]"
              title="Copy markdown summary"
            >
              {copiedSummary ? <Check size={13} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={13} className="text-zinc-400" />}
              <span className="hidden sm:inline">{copiedSummary ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

            {/* Primary Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              style={{ backgroundColor: primaryColor }}
              className="h-8 px-3 sm:px-3.5 rounded-lg hover:brightness-110 active:brightness-90 text-white text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm select-none whitespace-nowrap active:scale-[0.98]"
            >
              <Printer size={13} />
              <span>Print / Export PDF</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700/60 transition-all flex items-center justify-center cursor-pointer ml-0.5 active:scale-[0.96]"
              title="Close modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Main Body: Left Pages Sidebar + Right Preview Canvas */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-zinc-100/90 dark:bg-zinc-950">
          {/* Left Pages Sidebar */}
          {showSidebar && (
            <div className="w-40 sm:w-48 shrink-0 bg-zinc-50/95 dark:bg-zinc-900/95 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-10 select-none overflow-hidden animate-in slide-in-from-left-4 duration-200">
              {/* Sidebar Header */}
              <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                  <LayoutGrid size={13} className="text-zinc-400" />
                  <span>Pages</span>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {documentPages.length}
                </span>
              </div>

              {/* Thumbnails Scroll Column */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                {documentPages.map((page) => {
                  const isActive = activePage === page.pageNumber;
                  return (
                    <div
                      key={page.pageNumber}
                      onClick={() => handleScrollToPage(page.pageNumber)}
                      className="group flex flex-col items-center cursor-pointer"
                    >
                      {/* Live Mini Preview Thumbnail */}
                      <div 
                        className={cn(
                          "w-[110px] h-[155px] bg-white rounded-lg shadow-xs overflow-hidden relative transition-all duration-150 border-2",
                          isActive 
                            ? "shadow-md ring-2 ring-offset-1 dark:ring-offset-zinc-900" 
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 group-hover:shadow-sm"
                        )}
                        style={{
                          borderColor: isActive ? primaryColor : undefined,
                          ['--tw-ring-color' as any]: isActive ? `${primaryColor}40` : undefined,
                        }}
                      >
                        <div 
                          style={{ 
                            width: '794px', 
                            minHeight: '1123px', 
                            transform: 'scale(0.1385)', 
                            transformOrigin: 'top left',
                            pointerEvents: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {renderSinglePage(page, documentPages.length, true)}
                        </div>
                      </div>

                      {/* Page Label */}
                      <span 
                        className={cn(
                          "mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors",
                          isActive 
                            ? "text-white shadow-2xs" 
                            : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                        )}
                        style={{
                          backgroundColor: isActive ? primaryColor : undefined
                        }}
                      >
                        Page {page.pageNumber}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Scrollable Preview Canvas with Scaled Pages */}
          <div 
            ref={canvasScrollRef}
            onScroll={handleCanvasScroll}
            className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar flex flex-col items-center relative"
          >
            {/* Mouse Wheel Zoom Floating Hint & Mode Switcher */}
            <div className="sticky top-0 self-end z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-zinc-800/95 border border-zinc-200/90 dark:border-zinc-700/90 shadow-md text-[11px] text-zinc-600 dark:text-zinc-400 select-none backdrop-blur-md mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span>{wheelZoomDirect ? 'Mouse wheel zooms' : 'Ctrl + Wheel to zoom'}</span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <button
                type="button"
                onClick={() => setWheelZoomDirect(!wheelZoomDirect)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {wheelZoomDirect ? 'Switch to scroll' : 'Direct zoom'}
              </button>
            </div>

            {/* Outer width-compensated container for smooth zoom scrolling */}
            <div 
              style={{
                width: `${794 * (zoom / 100)}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: `${28 * (zoom / 100)}px`,
                transition: 'width 0.15s ease-out, gap 0.15s ease-out',
                paddingBottom: '6rem',
                transformOrigin: 'top center',
              }}
            >
              {/* Inner scaled container */}
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  width: '794px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '28px',
                  transition: 'transform 0.15s ease-out',
                }}
              >
                {documentPages.map((page) => (
                  <div 
                    key={page.pageNumber}
                    id={`record-page-${page.pageNumber}`}
                    className="w-[794px] min-h-[1123px] bg-white rounded-2xl shadow-xl border border-zinc-200/90 p-8 sm:p-12 flex flex-col justify-between select-text text-zinc-900 leading-normal shrink-0"
                    style={{
                      fontFamily: bodyFont !== 'inherit' ? `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` : undefined
                    }}
                  >
                    {renderSinglePage(page, documentPages.length, false)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AuroraModal>

      {/* Direct Body Portal for Clean Native Print / Save as PDF */}
      {typeof document !== 'undefined' && isOpen && createPortal(
        <div id="record-print-portal" className="hidden print:block">
          {documentPages.map((page) => (
            <div 
              key={`portal-page-${page.pageNumber}`}
              className="record-page-sheet bg-white text-zinc-900 p-0 m-0"
              style={{
                fontFamily: bodyFont !== 'inherit' ? `"${bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` : undefined,
                pageBreakAfter: page.isLastPage ? 'avoid' : 'always',
                breakAfter: page.isLastPage ? 'avoid' : 'page',
              }}
            >
              {renderSinglePage(page, documentPages.length, false)}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default RecordPdfExportModal;

import { 
  BuilderType, 
  UniversalTemplateEnvelope, 
  UniversalTemplateMetadata, 
  TemplateQueryParams, 
  TemplateCatalogResponse 
} from '../types/templates';
import { FORM_TEMPLATES } from '../components/Modals/NewFormModal';
import { TEMPLATE_AGENTS } from '../components/Modals/NewAgentModal';
import { MODULES } from '../constants/modules';
import { getDocumentTemplates } from './documentService';
import { API_BASE_URL } from '../config';

const API_BASE = `${API_BASE_URL}/api/templates`;

// In-memory cache for loaded template deep payloads
const payloadCache = new Map<string, UniversalTemplateEnvelope>();

// In-memory cache for catalog list queries
const catalogCache = new Map<string, TemplateCatalogResponse>();

export const getCachedTemplateCatalog = (
  params: TemplateQueryParams = {},
  tenantId?: string
): TemplateCatalogResponse | null => {
  const cacheKey = `${params.builderType || 'ALL'}_${params.includePayload ? 'with_payload' : 'no_payload'}_${tenantId || 'default'}`;
  return catalogCache.get(cacheKey) || null;
};

/**
 * Normalizes legacy built-in constants into the Universal Template envelope
 */
export const getFallbackBuiltinTemplates = (builderType?: BuilderType | string): UniversalTemplateMetadata[] => {
  const list: UniversalTemplateMetadata[] = [];

  // 1. FORMS
  if (!builderType || builderType === 'FORM' || builderType === 'ALL') {
    FORM_TEMPLATES.forEach(f => {
      list.push({
        id: f.id,
        slug: f.id.replace('tpl_', 'form-'),
        builderType: 'FORM',
        name: f.name,
        description: f.description,
        industry: 'Cross-Industry',
        category: f.category,
        tags: [f.category.toLowerCase(), 'form', 'intake'],
        icon: typeof f.icon === 'string' ? f.icon : 'FileText',
        version: '1.0.0',
        isSystem: true,
        complexity: 'Beginner',
        popularityScore: 90
      });
    });
  }

  // 2. AGENTS
  if (!builderType || builderType === 'AGENT' || builderType === 'ALL') {
    TEMPLATE_AGENTS.forEach(a => {
      list.push({
        id: a.id,
        slug: a.id.replace('agent_tpl_', 'agent-'),
        builderType: 'AGENT',
        name: a.name,
        description: a.description,
        industry: a.workforceMapping?.teamName?.includes('Finance') ? 'Financial Services & Fintech' : 'Customer Operations',
        category: a.roleTitle,
        department: a.workforceMapping?.teamName || 'Operations',
        tags: ['agent', 'ai', a.roleTitle.toLowerCase()],
        icon: 'Bot',
        version: a.version || '1.0.0',
        isSystem: true,
        complexity: 'Advanced',
        popularityScore: 95
      });
    });
  }

  // 3. MODULES
  if (!builderType || builderType === 'MODULE' || builderType === 'ALL') {
    MODULES.forEach(m => {
      list.push({
        id: m.id,
        slug: `mod-${m.id}`,
        builderType: 'MODULE',
        name: m.name,
        description: m.description || '',
        industry: 'Cross-Industry',
        category: m.category || 'Core',
        tags: ['module', 'data', (m.category || 'core').toLowerCase()],
        icon: typeof m.icon === 'string' ? m.icon : 'Database',
        version: '1.0.0',
        isSystem: true,
        complexity: 'Intermediate',
        popularityScore: 85
      });
    });
  }

  // 4. DOCUMENTS
  if (!builderType || builderType === 'DOCUMENT' || builderType === 'ALL') {
    const docTemplates = getDocumentTemplates();
    docTemplates.forEach((d: any) => {
      list.push({
        id: d.id,
        slug: d.id.replace('tmpl_', 'doc-'),
        builderType: 'DOCUMENT',
        name: d.name,
        description: d.description || '',
        industry: 'Cross-Industry',
        category: d.type === 'email' ? 'Email & Notifications' : 'Contracts & Agreements',
        tags: ['document', d.type, (d.metadata as any)?.paperSize || 'letter'],
        icon: 'FileText',
        version: `${d.version || 1}.0.0`,
        isSystem: true,
        complexity: 'Beginner',
        popularityScore: 80
      });
    });
  }

  return list;
};

const resolveToken = (explicitToken?: string): string => {
  if (explicitToken) return explicitToken;
  if (typeof window === 'undefined') return '';
  return (import.meta as any).env.VITE_DEV_TOKEN || localStorage.getItem('aurora_token') || '';
};

/**
 * Queries the Template Catalog API with automatic fallback to built-in constants
 */
export const queryTemplateCatalog = async (
  params: TemplateQueryParams = {},
  authToken?: string,
  tenantId?: string
): Promise<TemplateCatalogResponse> => {
  const query = new URLSearchParams();
  if (params.builderType) query.set('builderType', params.builderType);
  if (params.industry) query.set('industry', params.industry);
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.includePayload) query.set('includePayload', 'true');

  const isSimpleQuery = !params.search && !params.industry && !params.category && !params.tags;
  const cacheKey = `${params.builderType || 'ALL'}_${params.includePayload ? 'with_payload' : 'no_payload'}_${tenantId || 'default'}`;

  if (isSimpleQuery && catalogCache.has(cacheKey)) {
    return catalogCache.get(cacheKey)!;
  }

  try {
    const token = resolveToken(authToken);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await fetch(`${API_BASE}?${query.toString()}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.templates && data.templates.length > 0) {
      data.templates.forEach((t: any) => {
        if (t.payload) {
          if (!t.schemaPayload) t.schemaPayload = t.payload;
          payloadCache.set(t.id, t);
          if (t.slug) payloadCache.set(t.slug, t);
        }
      });
      if (isSimpleQuery) {
        catalogCache.set(cacheKey, data);
      }
      console.log(`[TemplateService] Loaded ${data.templates.length} templates from database for ${params.builderType || 'ALL'}`);
      return data;
    }
  } catch (err) {
    console.warn('[TemplateService] Server query failed or returned empty; using built-in catalog:', err);
  }

  // Fallback to in-memory built-ins
  let filtered = getFallbackBuiltinTemplates(params.builderType);

  if (params.industry && params.industry !== 'All Industries' && params.industry !== 'ALL') {
    filtered = filtered.filter(t => t.industry === params.industry);
  }
  if (params.category && params.category !== 'All Categories' && params.category !== 'ALL') {
    filtered = filtered.filter(t => t.category === params.category);
  }
  if (params.search && params.search.trim()) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(s) || 
      t.description.toLowerCase().includes(s) ||
      t.tags.some(tag => tag.toLowerCase().includes(s))
    );
  }

  return {
    templates: filtered,
    total: filtered.length,
    facets: {
      industries: [{ name: 'Cross-Industry', count: filtered.length }],
      categories: [],
      builderTypes: []
    }
  };
};

/**
 * Loads the full template envelope (including deep payload)
 */
export const getTemplateById = async (
  templateId: string,
  authToken?: string,
  tenantId?: string
): Promise<UniversalTemplateEnvelope | null> => {
  if (payloadCache.has(templateId)) {
    return payloadCache.get(templateId)!;
  }

  try {
    const token = resolveToken(authToken);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await fetch(`${API_BASE}/${templateId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.template) {
        if (data.template.payload && !data.template.schemaPayload) {
          data.template.schemaPayload = data.template.payload;
        }
        payloadCache.set(templateId, data.template);
        if (data.template.id) payloadCache.set(data.template.id, data.template);
        if (data.template.slug) payloadCache.set(data.template.slug, data.template);
        return data.template;
      }
    }
  } catch (err) {
    console.warn(`[TemplateService] Failed to fetch remote template ${templateId}:`, err);
  }

  // Fallback payload lookup from built-in constants
  // 1. Form
  const formMatch = FORM_TEMPLATES.find(f => f.id === templateId || f.id.replace('tpl_', 'form-') === templateId);
  if (formMatch) {
    const envelope: UniversalTemplateEnvelope = {
      id: formMatch.id,
      slug: formMatch.id.replace('tpl_', 'form-'),
      builderType: 'FORM',
      name: formMatch.name,
      description: formMatch.description,
      industry: 'Cross-Industry',
      category: formMatch.category,
      tags: ['form', formMatch.category.toLowerCase()],
      version: '1.0.0',
      isSystem: true,
      payload: formMatch.schema,
      schemaPayload: formMatch.schema
    };
    payloadCache.set(templateId, envelope);
    return envelope;
  }

  // 2. Agent
  const agentMatch = TEMPLATE_AGENTS.find(a => a.id === templateId || a.id.replace('agent_tpl_', 'agent-') === templateId);
  if (agentMatch) {
    const envelope: UniversalTemplateEnvelope = {
      id: agentMatch.id,
      slug: agentMatch.id.replace('agent_tpl_', 'agent-'),
      builderType: 'AGENT',
      name: agentMatch.name,
      description: agentMatch.description,
      industry: 'Customer Operations',
      category: agentMatch.roleTitle,
      tags: ['agent', 'ai'],
      version: agentMatch.version || '1.0.0',
      isSystem: true,
      payload: agentMatch,
      schemaPayload: agentMatch
    };
    payloadCache.set(templateId, envelope);
    return envelope;
  }

  // 3. Module
  const cleanModId = templateId.replace(/^mod-/, '');
  const modMatch = MODULES.find(m => m.id === templateId || m.id === cleanModId);
  if (modMatch) {
    const modPayload = {
      id: modMatch.id,
      type: (modMatch as any).type || 'RECORD',
      category: modMatch.category || 'General',
      layout: modMatch.layout || [],
      fields: modMatch.layout || [],
      dependencies: (modMatch as any).dependencies || []
    };
    const envelope: UniversalTemplateEnvelope = {
      id: modMatch.id,
      slug: `mod-${modMatch.id}`,
      builderType: 'MODULE',
      name: modMatch.name,
      description: modMatch.description || '',
      industry: 'Cross-Industry',
      category: modMatch.category || 'Core',
      tags: ['module', 'data'],
      version: '1.0.0',
      isSystem: true,
      payload: modPayload,
      schemaPayload: modPayload
    };
    payloadCache.set(templateId, envelope);
    if (envelope.slug) payloadCache.set(envelope.slug, envelope);
    return envelope;
  }

  return null;
};

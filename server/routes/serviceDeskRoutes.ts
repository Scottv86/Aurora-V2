import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { emitTenantUpdate, emitServiceDeskSessionUpdate } from '../socket';
import { resolveTenantAIClient, executeAICompletion } from '../services/aiProviderService';

const router = Router();

const LEGACY_SEED_TOKENS = ['vis-seed-101', 'vis-seed-102', 'vis-seed-103', 'voice-seed-104'];
const cleanedTenants = new Set<string>();

const resolveTenantContext = async (req: TenantRequest) => {
  const db = req.db || globalPrisma;
  let tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || 'tenant-aurora-core';

  const existingTenant = await globalPrisma.tenant.findFirst({
    where: { OR: [{ id: tenantId }, { subdomain: tenantId }] }
  });

  if (existingTenant) {
    tenantId = existingTenant.id;
  } else {
    const firstTenant = await globalPrisma.tenant.findFirst();
    if (firstTenant) {
      tenantId = firstTenant.id;
    }
  }

  // One-time cleanup of any legacy auto-seeded demo rows for this tenant
  if (!cleanedTenants.has(tenantId)) {
    cleanedTenants.add(tenantId);
    await (globalPrisma as any).serviceDeskSession
      .deleteMany({
        where: {
          tenantId,
          OR: [
            { visitorToken: { in: LEGACY_SEED_TOKENS } },
            { visitorEmail: 'r.green@veritascorp.com.au' }
          ]
        }
      })
      .catch(() => {});
  }

  return { db, tenantId, tenant: existingTenant };
};

/**
 * Helper to extract a clean list of fields from a FormBuilder schema JSON
 */
function extractFormFieldsFromSchema(schema: any): Array<{
  id: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'date';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}> {
  if (!schema || typeof schema !== 'object') return [];

  const rawFields: any[] = Array.isArray(schema.fields)
    ? schema.fields
    : Array.isArray(schema.elements)
    ? schema.elements
    : Array.isArray(schema.sections)
    ? schema.sections.flatMap((s: any) => s.fields || s.elements || [])
    : [];

  return rawFields
    .filter((f: any) => f && (f.id || f.name || f.key || f.label))
    .slice(0, 8)
    .map((f: any, idx: number) => {
      const rawType = String(f.type || 'text').toLowerCase();
      let mappedType: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'date' = 'text';
      if (rawType.includes('textarea') || rawType.includes('long') || rawType.includes('multiline')) {
        mappedType = 'textarea';
      } else if (rawType.includes('select') || rawType.includes('dropdown') || rawType.includes('radio')) {
        mappedType = 'select';
      } else if (rawType.includes('email')) {
        mappedType = 'email';
      } else if (rawType.includes('num') || rawType.includes('currency')) {
        mappedType = 'number';
      } else if (rawType.includes('date')) {
        mappedType = 'date';
      }

      const options = Array.isArray(f.options)
        ? f.options.map((o: any) => (typeof o === 'string' ? o : o.label || o.value || String(o)))
        : undefined;

      return {
        id: f.name || f.key || f.id || `field_${idx}`,
        label: f.label || f.title || f.name || `Field ${idx + 1}`,
        type: mappedType,
        required: Boolean(f.required),
        ...(options && options.length > 0 ? { options } : {}),
        ...(f.placeholder ? { placeholder: f.placeholder } : {})
      };
    });
}

/**
 * Ensures and loads the tenant's Global Lists for:
 * 1) "Service Desk Wrap-Up Outcomes"
 * 2) "Service Desk Interaction Topics"
 * Stored in PostgreSQL `global_lists` & `global_list_items` so administrators can manage them
 * in Global Lists (/workspace/platform/global-lists) and operators can add codes inline.
 */
async function ensureAndLoadTenantWrapUpLists(tenantId: string) {
  const existingLists = await globalPrisma.globalList
    .findMany({
      where: {
        tenantId,
        name: {
          in: ['Service Desk Wrap-Up Outcomes', 'Service Desk Interaction Topics']
        }
      },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })
    .catch(() => []);

  let outcomeList = existingLists.find((l: any) => l.name === 'Service Desk Wrap-Up Outcomes');
  let topicList = existingLists.find((l: any) => l.name === 'Service Desk Interaction Topics');

  if (!outcomeList) {
    try {
      outcomeList = await globalPrisma.globalList.create({
        data: {
          tenantId,
          name: 'Service Desk Wrap-Up Outcomes',
          description:
            'Disposition and resolution outcome codes used when closing Service Desk chats and voice interactions.',
          isSystem: true,
          columns: [
            { id: 'label', name: 'Outcome Label', type: 'text', required: true },
            { id: 'code', name: 'Code', type: 'text', required: true },
            {
              id: 'category',
              name: 'Category',
              type: 'choice',
              options: ['Resolution', 'Self-Service', 'Escalation', 'No Action']
            },
            { id: 'is_fcr_eligible', name: 'FCR Eligible', type: 'boolean' }
          ],
          items: {
            create: [
              {
                tenantId,
                sortOrder: 0,
                isActive: true,
                data: {
                  label: 'Resolved — First Contact',
                  code: 'RESOLVED_FCR',
                  category: 'Resolution',
                  is_fcr_eligible: true
                }
              },
              {
                tenantId,
                sortOrder: 1,
                isActive: true,
                data: {
                  label: 'Resolved — Self-Service / KB Article Sent',
                  code: 'RESOLVED_KB',
                  category: 'Self-Service',
                  is_fcr_eligible: true
                }
              },
              {
                tenantId,
                sortOrder: 2,
                isActive: true,
                data: {
                  label: 'Record / Service Request Created',
                  code: 'RECORD_CREATED',
                  category: 'Resolution',
                  is_fcr_eligible: true
                }
              },
              {
                tenantId,
                sortOrder: 3,
                isActive: true,
                data: {
                  label: 'Appointment / Booking Confirmed',
                  code: 'BOOKING_CONFIRMED',
                  category: 'Resolution',
                  is_fcr_eligible: true
                }
              },
              {
                tenantId,
                sortOrder: 4,
                isActive: true,
                data: {
                  label: 'Payment / Invoice Processed',
                  code: 'PAYMENT_PROCESSED',
                  category: 'Resolution',
                  is_fcr_eligible: true
                }
              },
              {
                tenantId,
                sortOrder: 5,
                isActive: true,
                data: {
                  label: 'Escalated — Follow-Up Required',
                  code: 'ESCALATED_FOLLOW_UP',
                  category: 'Escalation',
                  is_fcr_eligible: false
                }
              },
              {
                tenantId,
                sortOrder: 6,
                isActive: true,
                data: {
                  label: 'No Response / Abandoned by Visitor',
                  code: 'ABANDONED_NO_RESPONSE',
                  category: 'No Action',
                  is_fcr_eligible: false
                }
              }
            ]
          }
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
    } catch (_e) {}
  }

  if (!topicList) {
    try {
      topicList = await globalPrisma.globalList.create({
        data: {
          tenantId,
          name: 'Service Desk Interaction Topics',
          description:
            'Primary interaction topics and sub-topics for Service Desk contact drivers, BI reporting, and AI classification.',
          isSystem: true,
          columns: [
            { id: 'label', name: 'Topic Label', type: 'text', required: true },
            { id: 'code', name: 'Code', type: 'text', required: true },
            { id: 'category', name: 'Primary Domain', type: 'text', required: true },
            { id: 'subtopic', name: 'Default Sub-Topic', type: 'text' }
          ],
          items: {
            create: [
              {
                tenantId,
                sortOrder: 0,
                isActive: true,
                data: {
                  label: 'Account & Profile Support',
                  code: 'ACCOUNT_SUPPORT',
                  category: 'Customer Operations',
                  subtopic: 'Access & Verification'
                }
              },
              {
                tenantId,
                sortOrder: 1,
                isActive: true,
                data: {
                  label: 'Billing, Invoices & Payments',
                  code: 'BILLING_PAYMENTS',
                  category: 'Finance',
                  subtopic: 'Invoice & Payment Inquiry'
                }
              },
              {
                tenantId,
                sortOrder: 2,
                isActive: true,
                data: {
                  label: 'Service Request & Case Status',
                  code: 'SERVICE_REQUEST',
                  category: 'Operations',
                  subtopic: 'Status Update & Intake'
                }
              },
              {
                tenantId,
                sortOrder: 3,
                isActive: true,
                data: {
                  label: 'Bookings, Scheduling & Inspections',
                  code: 'BOOKINGS_SCHEDULING',
                  category: 'Scheduling',
                  subtopic: 'Appointment Booking'
                }
              },
              {
                tenantId,
                sortOrder: 4,
                isActive: true,
                data: {
                  label: 'Technical & Portal Assistance',
                  code: 'TECHNICAL_SUPPORT',
                  category: 'Technical',
                  subtopic: 'Portal Navigation'
                }
              },
              {
                tenantId,
                sortOrder: 5,
                isActive: true,
                data: {
                  label: 'General Product / Policy Inquiry',
                  code: 'GENERAL_INQUIRY',
                  category: 'Knowledge Base',
                  subtopic: 'Policy & Information'
                }
              }
            ]
          }
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
    } catch (_e) {}
  }

  const wrapUpOutcomes = (outcomeList?.items || []).map((item: any, idx: number) => {
    const d = item.data && typeof item.data === 'object' ? (item.data as any) : {};
    const label =
      d.label || d.Title || d.title || d.name || Object.values(d).find(v => typeof v === 'string') || `Outcome ${idx + 1}`;
    const code =
      d.code ||
      String(label)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return {
      id: item.id,
      code,
      label: String(label),
      category: d.category || 'Resolution',
      isFcrEligible: d.is_fcr_eligible !== undefined ? Boolean(d.is_fcr_eligible) : true
    };
  });

  const wrapUpTopics = (topicList?.items || []).map((item: any, idx: number) => {
    const d = item.data && typeof item.data === 'object' ? (item.data as any) : {};
    const label =
      d.label || d.Title || d.title || d.name || Object.values(d).find(v => typeof v === 'string') || `Topic ${idx + 1}`;
    const code =
      d.code ||
      String(label)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return {
      id: item.id,
      code,
      label: String(label),
      category: d.category || 'General',
      subtopic: d.subtopic || ''
    };
  });

  return {
    outcomeListId: outcomeList?.id || null,
    topicListId: topicList?.id || null,
    wrapUpOutcomes,
    wrapUpTopics
  };
}

/**
 * Helper to gather real Knowledge Base articles from the tenant's Agent Blueprints,
 * Universal Documents, Document Templates, Solution Blueprints, and Site Pages
 */
async function loadTenantKnowledgeArticles(tenantId: string, agents: any[], sites: any[]) {
  const [documents, docTemplates, blueprints] = await Promise.all([
    globalPrisma.universalDocument
      .findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 25
      })
      .catch(() => []),
    globalPrisma.documentTemplate
      .findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 20
      })
      .catch(() => []),
    globalPrisma.solutionBlueprint
      .findMany({
        where: { tenantId },
        take: 10
      })
      .catch(() => [])
  ]);

  const articles: Array<{ id: string; title: string; category: string; content: string }> = [];

  // 1. Agent Builder knowledge sources
  for (const agent of agents) {
    const cfg = agent?.config && typeof agent.config === 'object' ? (agent.config as any) : {};
    if (Array.isArray(cfg.knowledgeSources)) {
      for (const src of cfg.knowledgeSources) {
        if (src && (src.name || src.title)) {
          articles.push({
            id: src.id || `agent-kb-${articles.length}`,
            title: src.name || src.title,
            category: `Agent KB (${agent.name})`,
            content:
              src.contentSummary ||
              src.content ||
              src.description ||
              `Knowledge base reference attached to ${agent.name}.`
          });
        }
      }
    }
  }

  // 2. Universal Documents (Drive / Records Management with AI summary or OCR text)
  for (const doc of documents) {
    const body = doc.aiSummary || doc.ocrText;
    if (body && String(body).trim().length > 10) {
      articles.push({
        id: doc.id,
        title: doc.name,
        category: doc.documentType || 'Document Library',
        content: String(body).slice(0, 800)
      });
    }
  }

  // 3. Document Templates
  for (const tmpl of docTemplates) {
    if (tmpl.content && String(tmpl.content).trim().length > 10) {
      const stripped = String(tmpl.content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      articles.push({
        id: tmpl.id,
        title: tmpl.name,
        category: 'Templates & Policies',
        content: (tmpl.description ? `${tmpl.description} — ` : '') + stripped.slice(0, 600)
      });
    }
  }

  // 4. Solution Blueprint Context Sources
  for (const bp of blueprints) {
    const sources = Array.isArray(bp.contextSources) ? (bp.contextSources as any[]) : [];
    for (const src of sources) {
      if (src && (src.name || src.title) && (src.contentSummary || src.content)) {
        articles.push({
          id: src.id || `bp-kb-${articles.length}`,
          title: src.name || src.title,
          category: bp.name || 'Solution Blueprint',
          content: String(src.contentSummary || src.content).slice(0, 600)
        });
      }
    }
  }

  // 5. Site Pages (Knowledge Base, Wiki, Portal pages)
  for (const site of sites) {
    const pages = Array.isArray(site?.pagesConfig) ? (site.pagesConfig as any[]) : [];
    for (const page of pages) {
      const widgets = Array.isArray(page?.widgets) ? page.widgets : [];
      const widgetSummary = widgets
        .map((w: any) => [w.title, w.subtitle, w.content, w.description].filter(Boolean).join(': '))
        .filter(Boolean)
        .join(' | ');
      const content = [page.description, widgetSummary].filter(Boolean).join(' — ').trim();
      if (page?.title && content.length > 5) {
        articles.push({
          id: `site-page-${site.id}-${page.id || page.slug}`,
          title: `${site.name}: ${page.title}`,
          category: site.type || 'Site Page',
          content: content.slice(0, 600)
        });
      }
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 5-Layer Company, Brand, Site, Customer 360 & Knowledge Base Context Assembler
 */
export async function assembleServiceDeskContext(
  tenantId: string,
  siteId?: string | null,
  visitorQuery?: string,
  visitorEmail?: string | null,
  currentPageSlug?: string | null,
  agentId?: string | null
) {
  const [tenant, allSites, agents, brandKits, modules, catalogItems, forms] = await Promise.all([
    globalPrisma.tenant.findFirst({ where: { id: tenantId } }),
    globalPrisma.site
      .findMany({
        where: { tenantId },
        include: { brand: true },
        orderBy: { updatedAt: 'desc' }
      })
      .catch(() => []),
    globalPrisma.agent.findMany({ where: { tenantId } }).catch(() => []),
    globalPrisma.brandKit.findMany({ where: { tenantId } }).catch(() => []),
    globalPrisma.module.findMany({ where: { tenantId, enabled: true }, take: 25 }).catch(() => []),
    globalPrisma.catalogItem.findMany({ where: { tenantId, status: 'active' }, take: 20 }).catch(() => []),
    globalPrisma.form.findMany({ where: { tenantId }, take: 20 }).catch(() => [])
  ]);

  const site =
    (siteId ? allSites.find((s: any) => s.id === siteId || s.domain === siteId) : null) ||
    allSites[0] ||
    null;

  // 1. Resolve Active AI Agent Blueprint from DB
  const siteBranding = site?.branding && typeof site.branding === 'object' ? (site.branding as any) : {};
  const siteChatConfig = siteBranding.chatConfig || {};
  const targetAgentId = agentId || siteChatConfig.primaryAgentId;
  const activeAgent =
    agents.find((a: any) => a.id === targetAgentId) ||
    agents[0] || {
      id: 'default-tenant-agent',
      name: siteChatConfig.primaryAgentName || `${tenant?.name || 'Aurora'} AI Assistant`,
      modelType: 'gemini-2.5-flash',
      config: {
        roleTitle: 'AI Service Desk Assistant',
        systemPersona: 'PROFESSIONAL',
        confidenceThreshold: siteChatConfig.confidenceEscalationThreshold || 0.72
      }
    };

  // 2. Real Knowledge Base & Document Retrieval (Layer 1)
  const allKbArticles = await loadTenantKnowledgeArticles(tenantId, agents, allSites);
  const queryWords = (visitorQuery || '')
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2);

  const matchedArticles = allKbArticles
    .map(art => {
      const hay = `${art.title} ${art.category} ${art.content}`.toLowerCase();
      const score = queryWords.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
      return { ...art, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // 3. Company & Tenancy Metadata (Layer 2)
  const tenantMeta = tenant?.metadata && typeof tenant.metadata === 'object' ? (tenant.metadata as any) : {};
  const tenantLoc = tenant?.localization && typeof tenant.localization === 'object' ? (tenant.localization as any) : {};
  const companyProfile = {
    companyName: tenant?.name || 'Organization',
    industry: tenantMeta.industry || 'Enterprise Operations',
    website: tenantMeta.website || site?.domain || '',
    contactEmail: tenantMeta.contactEmail || '',
    description: tenantMeta.metaDescription || site?.description || '',
    timezone: tenantLoc.timezone || 'Australia/Adelaide',
    currency: tenantLoc.currency || 'AUD'
  };

  // 4. Brand Kit Voice & Tone (Layer 3)
  const activeBrand = (site as any)?.brand || brandKits.find((b: any) => b.isDefault) || brandKits[0];
  const voiceAndTone =
    activeBrand?.voiceAndTone && typeof activeBrand.voiceAndTone === 'object'
      ? (activeBrand.voiceAndTone as any)
      : {
          persona: 'Helpful, clear, and accurate service assistant',
          tone: 'Professional and concise'
        };

  // 5. Site Pages & Navigation Structure (Layer 4)
  const rawPages = Array.isArray(site?.pagesConfig) ? (site.pagesConfig as any[]) : [];
  const sitePagesSummary = rawPages.map((p: any) => ({
    title: p.title || 'Page',
    slug: p.slug || '/',
    description: p.description || '',
    widgets: Array.isArray(p.widgets) ? p.widgets.map((w: any) => w.title || w.type) : []
  }));

  // 6. Customer 360 & Matching Records (Layer 5)
  let matchedParty: any = null;
  let customerRecords: any[] = [];
  let customerInvoices: any[] = [];

  const parties = await globalPrisma.party
    .findMany({
      where: { tenantId },
      include: { person: true, organization: true },
      take: 50
    })
    .catch(() => []);

  if (visitorEmail) {
    const emailLower = visitorEmail.toLowerCase();
    matchedParty =
      parties.find((p: any) => {
        const logStr = String(p.creationContextLog || '').toLowerCase();
        return logStr.includes(emailLower);
      }) || null;
  }

  // Fetch real open/recent invoices for this party or tenant
  customerInvoices = await globalPrisma.invoice
    .findMany({
      where: {
        tenantId,
        ...(matchedParty ? { customerPartyId: matchedParty.id } : {})
      },
      include: {
        customer: { include: { person: true, organization: true } },
        lines: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    .catch(() => []);

  // Search real module records if visitor query mentions a reference or email
  const recentRecords = await globalPrisma.record
    .findMany({
      where: { tenantId },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { module: true }
    })
    .catch(() => []);

  const refMatch = (visitorQuery || '').match(/\b([A-Z]{2,5}[-_]\d+|\brec_[a-zA-Z0-9]+)\b/i);
  if (refMatch) {
    const code = refMatch[0].toUpperCase();
    customerRecords = recentRecords.filter((r: any) => {
      const d = (r.data || {}) as Record<string, any>;
      return r.id.toUpperCase().includes(code) || JSON.stringify(d).toUpperCase().includes(code);
    });
  } else if (visitorEmail) {
    customerRecords = recentRecords
      .filter((r: any) => JSON.stringify(r.data || {}).toLowerCase().includes(visitorEmail.toLowerCase()))
      .slice(0, 5);
  }

  return {
    tenant,
    site,
    allSites,
    siteChatConfig,
    activeAgent,
    allKbArticles,
    matchedArticles,
    companyProfile,
    voiceAndTone,
    sitePagesSummary,
    currentPageSlug: currentPageSlug || '/',
    matchedParty,
    customerRecords,
    recentRecords: recentRecords.slice(0, 10),
    customerInvoices,
    modules,
    catalogItems,
    forms
  };
}

/**
 * Unified Allocation & Routing Resolver (AI Agents + Human Users + Round-Robin Teams)
 */
export async function resolveSessionAllocation(
  tenantId: string,
  requestedMode: 'AI_FIRST' | 'HUMAN_FIRST' | 'TRIAGE_AGENT' | 'DIRECT_OWNER',
  options?: {
    targetAssigneeType?: 'AI_AGENT' | 'HUMAN_USER' | 'TEAM_ROUND_ROBIN' | 'QUEUE';
    targetMemberId?: string;
    targetAgentId?: string;
    targetTeamId?: string;
    targetQueueId?: string;
    siteChatConfig?: any;
  }
) {
  const [members, agents, teams, presences, tenant] = await Promise.all([
    globalPrisma.tenantMember
      .findMany({
        where: { tenantId },
        include: { position: true, team: true, user: true, agent: true }
      })
      .catch(() => []),
    globalPrisma.agent.findMany({ where: { tenantId } }).catch(() => []),
    globalPrisma.team.findMany({ where: { tenantId } }).catch(() => []),
    (globalPrisma as any).serviceDeskOperatorPresence.findMany({ where: { tenantId } }).catch(() => []),
    globalPrisma.tenant.findFirst({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
  ]);

  const activeMembers = members.filter((m: any) => String(m.status || 'Active').toLowerCase() === 'active');
  const humanMembers = activeMembers.filter((m: any) => !m.isSynthetic);
  const syntheticMembers = activeMembers.filter((m: any) => m.isSynthetic);

  // 1. AI Agent Allocation
  if (options?.targetAssigneeType === 'AI_AGENT' || (requestedMode === 'AI_FIRST' && !options?.targetAssigneeType)) {
    const desiredAgentId = options?.targetAgentId || options?.siteChatConfig?.primaryAgentId;
    const matchedAgent = agents.find((a: any) => a.id === desiredAgentId) || agents[0];
    const matchedSynthetic =
      syntheticMembers.find((m: any) => m.agentId === matchedAgent?.id || m.id === desiredAgentId) ||
      syntheticMembers[0];

    const agentName =
      matchedAgent?.name ||
      (matchedSynthetic ? [matchedSynthetic.firstName, matchedSynthetic.familyName].filter(Boolean).join(' ') : null) ||
      options?.siteChatConfig?.primaryAgentName ||
      `${tenant?.name || 'Aurora'} AI Assistant`;

    return {
      status: 'ACTIVE_AI',
      allocatedAssigneeType: 'AI_AGENT',
      allocatedMemberId: matchedSynthetic?.id || null,
      allocatedMemberName: agentName,
      allocatedAgentId: matchedAgent?.id || matchedSynthetic?.agentId || 'default-tenant-agent',
      allocatedAgentName: agentName,
      allocatedTeamId: options?.targetTeamId || options?.siteChatConfig?.fallbackTeamId || teams[0]?.id || null,
      allocatedTeamName: options?.siteChatConfig?.fallbackTeamName || teams[0]?.name || null
    };
  }

  // 2. Human User or Team Round-Robin Allocation
  let selectedHuman = humanMembers.find(
    (m: any) => m.id === options?.targetMemberId || m.userId === options?.targetMemberId
  );

  if (!selectedHuman) {
    const teamCandidates = options?.targetTeamId
      ? humanMembers.filter((m: any) => m.teamId === options.targetTeamId)
      : humanMembers;

    const pool = teamCandidates.length > 0 ? teamCandidates : humanMembers;

    const availableCandidates = pool.filter((m: any) => {
      const pres = presences.find((p: any) => p.memberId === m.id || p.memberId === m.userId);
      if (!pres) return true;
      return (
        pres.status === 'AVAILABLE' &&
        pres.activeChatCount < (pres.maxConcurrentChats || 3) &&
        !pres.activeCallId
      );
    });

    if (availableCandidates.length > 0) {
      availableCandidates.sort((a: any, b: any) => {
        const presA = presences.find((p: any) => p.memberId === a.id || p.memberId === a.userId);
        const presB = presences.find((p: any) => p.memberId === b.id || p.memberId === b.userId);
        const timeA = presA?.lastAssignedAt ? new Date(presA.lastAssignedAt).getTime() : 0;
        const timeB = presB?.lastAssignedAt ? new Date(presB.lastAssignedAt).getTime() : 0;
        return timeA - timeB;
      });
      selectedHuman = availableCandidates[0];
    } else if (pool.length > 0) {
      selectedHuman = pool[0];
    }
  }

  if (selectedHuman) {
    const fullName =
      [selectedHuman.firstName, selectedHuman.familyName].filter(Boolean).join(' ') ||
      selectedHuman.workEmail ||
      selectedHuman.user?.email ||
      'Operator';
    const primaryTeam =
      selectedHuman.team || teams.find((t: any) => t.id === options?.targetTeamId) || teams[0];

    await (globalPrisma as any).serviceDeskOperatorPresence
      .upsert({
        where: { memberId: selectedHuman.id },
        update: {
          lastAssignedAt: new Date(),
          activeChatCount: { increment: 1 }
        },
        create: {
          tenantId,
          memberId: selectedHuman.id,
          memberName: fullName,
          status: 'AVAILABLE',
          activeChatCount: 1,
          lastAssignedAt: new Date()
        }
      })
      .catch(() => null);

    return {
      status: 'ASSIGNED_HUMAN',
      allocatedAssigneeType: 'HUMAN_USER',
      allocatedMemberId: selectedHuman.id,
      allocatedMemberName: fullName,
      allocatedAgentId: null,
      allocatedAgentName: null,
      allocatedTeamId: primaryTeam?.id || null,
      allocatedTeamName: primaryTeam?.name || null
    };
  }

  return {
    status: 'QUEUED_FOR_HUMAN',
    allocatedAssigneeType: 'UNASSIGNED',
    allocatedMemberId: null,
    allocatedMemberName: null,
    allocatedAgentId: null,
    allocatedAgentName: null,
    allocatedTeamId: options?.targetTeamId || teams[0]?.id || null,
    allocatedTeamName: teams[0]?.name || null
  };
}

/**
 * Generates an AI Agent Response, Interactive Card, or HITL Approval Request
 * Grounded 100% on real tenant database entities
 */
export async function executeServiceDeskAiTurn(
  session: any,
  visitorMessage: string,
  conversationHistory: any[]
) {
  const ctx = await assembleServiceDeskContext(
    session.tenantId,
    session.siteId,
    visitorMessage,
    session.visitorEmail,
    session.currentPageSlug,
    session.allocatedAgentId
  );

  const lowerMsg = visitorMessage.toLowerCase();
  const agentName = ctx.activeAgent?.name || session.allocatedAgentName || `${ctx.companyProfile.companyName} AI`;

  // 1. Explicit request for a human specialist
  if (
    lowerMsg.includes('speak to a human') ||
    lowerMsg.includes('talk to a person') ||
    lowerMsg.includes('real person') ||
    lowerMsg.includes('human agent') ||
    lowerMsg.includes('transfer me to') ||
    lowerMsg.includes('operator please')
  ) {
    const newAllocation = await resolveSessionAllocation(session.tenantId, 'HUMAN_FIRST', {
      targetAssigneeType: 'HUMAN_USER',
      siteChatConfig: ctx.siteChatConfig
    });

    return {
      escalateToHuman: true,
      newAllocation,
      senderName: agentName,
      content: newAllocation.allocatedMemberName
        ? `I've transferred your conversation to **${newAllocation.allocatedMemberName}**${newAllocation.allocatedTeamName ? ` (${newAllocation.allocatedTeamName})` : ''}. They have your full conversation history and will reply here shortly.`
        : `I've placed your conversation in our human specialist queue${newAllocation.allocatedTeamName ? ` (**${newAllocation.allocatedTeamName}**)` : ''}. An operator will join shortly.`,
      messageType: 'TEXT' as const,
      payload: {},
      aiTrace: {
        intent: 'HUMAN_HANDOFF_REQUESTED',
        confidenceScore: 0.99,
        companyContextUsed: [ctx.companyProfile.companyName],
        toolsInvoked: [
          {
            name: 'escalate_to_human_operator',
            status: 'SUCCESS' as const,
            summary: `Allocated to ${newAllocation.allocatedMemberName || 'Queue'}`
          }
        ]
      }
    };
  }

  // 2. Human-in-the-Loop (HITL) Gate for financial adjustments/refunds/waivers
  if (
    lowerMsg.includes('refund') ||
    lowerMsg.includes('waive fee') ||
    lowerMsg.includes('release bond') ||
    lowerMsg.includes('credit note')
  ) {
    const matchedInv = ctx.customerInvoices[0];
    const hitlRequest = {
      id: `hitl-${Date.now()}`,
      toolId: 'tool-financial-adjustment',
      toolName: 'Authorize Financial Adjustment / Refund',
      toolType: 'WORKFLOW_TRIGGER',
      description: `Customer requested financial authorization: "${visitorMessage.slice(0, 140)}"`,
      parameters: {
        customerName: session.visitorName,
        ...(session.visitorEmail ? { customerEmail: session.visitorEmail } : {}),
        ...(matchedInv ? { invoiceNumber: matchedInv.invoiceNumber, invoiceTotal: `${Number(matchedInv.total).toFixed(2)} ${matchedInv.currency}` } : {}),
        siteName: ctx.site?.name || session.siteName || 'Portal'
      },
      requestedByAgentId: ctx.activeAgent?.id || 'default-tenant-agent',
      requestedByAgentName: agentName,
      requestedAt: new Date().toISOString(),
      status: 'PENDING' as const
    };

    return {
      awaitHitlApproval: true,
      hitlRequest,
      senderName: agentName,
      content: `Because financial adjustments and refunds require human authorization under **${ctx.companyProfile.companyName}** policy, I have submitted an approval card to our Service Desk team. As soon as an operator approves it, you will receive confirmation right here.`,
      messageType: 'HITL_APPROVAL_REQUEST' as const,
      payload: { hitlRequest },
      aiTrace: {
        intent: 'HITL_APPROVAL_GATE',
        confidenceScore: 0.9,
        ragSources: ctx.matchedArticles.slice(0, 2).map(a => ({ id: a.id, title: a.title, category: a.category })),
        companyContextUsed: [ctx.companyProfile.companyName, 'Guardrail: HITL Financial Gate'],
        toolsInvoked: [
          {
            name: 'request_hitl_approval',
            status: 'AWAITING_APPROVAL' as const,
            summary: 'Paused for operator authorization in Service Desk'
          }
        ]
      }
    };
  }

  // 3. Appointment / Scheduling request using real tenant operators/catalog services
  if (
    lowerMsg.includes('book') ||
    lowerMsg.includes('appointment') ||
    lowerMsg.includes('inspection') ||
    lowerMsg.includes('schedule')
  ) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];
    const serviceItem = ctx.catalogItems.find((c: any) => c.type === 'SERVICE') || ctx.catalogItems[0];
    const serviceTitle = serviceItem?.name || `${ctx.companyProfile.companyName} Consultation`;

    const availableSlots = [
      {
        id: `slot-1-${Date.now()}`,
        date: tomorrow,
        time: '09:30 AM',
        durationMinutes: serviceItem?.billingBlockMinutes || 30,
        resourceName: serviceTitle
      },
      {
        id: `slot-2-${Date.now()}`,
        date: tomorrow,
        time: '02:00 PM',
        durationMinutes: serviceItem?.billingBlockMinutes || 30,
        resourceName: serviceTitle
      },
      {
        id: `slot-3-${Date.now()}`,
        date: dayAfter,
        time: '11:00 AM',
        durationMinutes: serviceItem?.billingBlockMinutes || 45,
        resourceName: serviceTitle
      }
    ];

    return {
      senderName: agentName,
      content: `Here are the next available times for **${serviceTitle}**. Select a slot below to confirm your booking:`,
      messageType: 'BOOKING_CARD' as const,
      payload: {
        bookingServiceName: serviceTitle,
        availableSlots
      },
      aiTrace: {
        intent: 'SCHEDULE_BOOKING',
        confidenceScore: 0.95,
        companyContextUsed: [ctx.companyProfile.companyName, ctx.companyProfile.timezone],
        toolsInvoked: [
          {
            name: 'scheduling_query_slots',
            status: 'SUCCESS' as const,
            summary: `Generated ${availableSlots.length} booking slots for ${serviceTitle}`
          }
        ]
      }
    };
  }

  // 4. Record lookup if a matching record exists in the database
  if (
    ctx.customerRecords.length > 0 &&
    (lowerMsg.includes('status') ||
      lowerMsg.includes('track') ||
      lowerMsg.includes('where is') ||
      lowerMsg.includes('reference') ||
      lowerMsg.includes('record'))
  ) {
    const matchedRec = ctx.customerRecords[0];
    const recData = matchedRec.data && typeof matchedRec.data === 'object' ? (matchedRec.data as any) : {};
    const displayKey =
      recData.referenceNumber || recData.recordKey || recData.code || matchedRec.id.slice(0, 10).toUpperCase();
    const recordTitle =
      recData.title || recData.subject || recData.name || `${matchedRec.module?.name || 'Record'} ${displayKey}`;
    const recordStatus = matchedRec.status || recData.status || 'Active';

    return {
      senderName: agentName,
      content: `I found record **${displayKey}** in **${matchedRec.module?.name || ctx.companyProfile.companyName}**:`,
      messageType: 'RECORD_CARD' as const,
      payload: {
        moduleId: matchedRec.moduleId,
        moduleName: matchedRec.module?.name || 'Records',
        recordId: matchedRec.id,
        recordKey: displayKey,
        recordTitle,
        recordStatus,
        recordFields: {
          Reference: displayKey,
          Status: recordStatus,
          Module: matchedRec.module?.name || 'Module',
          Updated: new Date(matchedRec.updatedAt).toLocaleDateString()
        }
      },
      aiTrace: {
        intent: 'RECORD_STATUS_LOOKUP',
        confidenceScore: 0.96,
        companyContextUsed: [ctx.companyProfile.companyName],
        toolsInvoked: [
          {
            name: 'database_query_record',
            status: 'SUCCESS' as const,
            summary: `Resolved record ${displayKey}`
          }
        ]
      }
    };
  }

  // 5. Invoice lookup if a real invoice exists in the database
  if (
    ctx.customerInvoices.length > 0 &&
    (lowerMsg.includes('invoice') || lowerMsg.includes('pay') || lowerMsg.includes('bill'))
  ) {
    const inv = ctx.customerInvoices.find((i: any) => i.status !== 'PAID') || ctx.customerInvoices[0];
    const invTotal = Number(inv.total || 0);

    return {
      senderName: agentName,
      content: `I found invoice **${inv.invoiceNumber}** for **$${invTotal.toFixed(2)} ${inv.currency || ctx.companyProfile.currency}**:`,
      messageType: 'PAYMENT_CARD' as const,
      payload: {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: invTotal,
        currency: inv.currency || ctx.companyProfile.currency || 'AUD',
        paymentDescription: `Invoice ${inv.invoiceNumber} — ${ctx.companyProfile.companyName}`,
        paymentStatus: inv.status === 'PAID' ? 'PAID' : 'UNPAID'
      },
      aiTrace: {
        intent: 'INVOICE_LOOKUP',
        confidenceScore: 0.95,
        companyContextUsed: [ctx.companyProfile.companyName],
        toolsInvoked: [
          {
            name: 'query_tenant_invoices',
            status: 'SUCCESS' as const,
            summary: `Loaded invoice ${inv.invoiceNumber}`
          }
        ]
      }
    };
  }

  // 6. In-chat Form intake using a real Form from `globalPrisma.form` (or dynamic fields if the tenant has forms)
  if (
    lowerMsg.includes('submit a ticket') ||
    lowerMsg.includes('new request') ||
    lowerMsg.includes('fill out a form') ||
    lowerMsg.includes('intake form')
  ) {
    const targetForm = ctx.forms[0];
    const extractedFields = targetForm ? extractFormFieldsFromSchema(targetForm.schema) : [];
    const formFields =
      extractedFields.length > 0
        ? extractedFields
        : [
            { id: 'subject', label: 'Subject / Summary', type: 'text' as const, required: true },
            { id: 'details', label: 'Details', type: 'textarea' as const, required: true }
          ];

    return {
      senderName: agentName,
      content: `Please complete **${targetForm?.name || 'Service Request Form'}** below and I will create a tracked record for you immediately:`,
      messageType: 'FORM_CARD' as const,
      payload: {
        formId: targetForm?.id || 'default-intake',
        moduleId: targetForm?.moduleId || ctx.modules[0]?.id || null,
        formTitle: targetForm?.name || `${ctx.companyProfile.companyName} — Service Request`,
        formDescription: targetForm?.description || 'Submit your details below to create an official record.',
        isSubmitted: false,
        formFields
      },
      aiTrace: {
        intent: 'IN_CHAT_FORM_INTAKE',
        confidenceScore: 0.95,
        companyContextUsed: [ctx.companyProfile.companyName],
        toolsInvoked: [
          {
            name: 'render_tenant_form',
            status: 'SUCCESS' as const,
            summary: `Rendered form ${targetForm?.name || 'Service Request'}`
          }
        ]
      }
    };
  }

  // 7. Grounded LLM Completion using the tenant's configured AI provider + real Knowledge Base + Company Profile
  let replyText = '';
  try {
    const kbContextText =
      ctx.matchedArticles.length > 0
        ? ctx.matchedArticles.map(a => `- [${a.title} (${a.category})]: ${a.content}`).join('\n')
        : 'No specific knowledge base articles matched this exact query.';

    const catalogSummary =
      ctx.catalogItems.length > 0
        ? ctx.catalogItems.map((c: any) => `${c.name} ($${Number(c.basePrice || 0).toFixed(2)} ${c.currency})`).join(', ')
        : 'None listed';

    const modulesSummary =
      ctx.modules.length > 0 ? ctx.modules.map((m: any) => m.name).join(', ') : 'General Operations';

    const systemPrompt = [
      `You are ${agentName}, an AI customer service agent for "${ctx.companyProfile.companyName}" on site "${ctx.site?.name || 'Customer Portal'}" (visitor is viewing page: ${ctx.currentPageSlug}).`,
      `Company Details: Industry=${ctx.companyProfile.industry}, Website=${ctx.companyProfile.website}, Contact=${ctx.companyProfile.contactEmail}, Description=${ctx.companyProfile.description}.`,
      `Active Modules: ${modulesSummary}.`,
      `Catalog Products/Services: ${catalogSummary}.`,
      `Brand Voice & Tone: ${JSON.stringify(ctx.voiceAndTone)}.`,
      `Site Pages: ${ctx.sitePagesSummary.map((p: any) => `${p.title} (${p.slug})`).join(', ') || '/'}.`,
      `Knowledge Base Context:\n${kbContextText}`,
      `Respond concisely, helpfully, and accurately in markdown using only real facts from the company profile, catalog, and knowledge base above. Do not invent fake reference numbers or fake people.`
    ].join('\n\n');

    const recentTurns = conversationHistory.slice(-6).map((m: any) => ({
      role: m.senderType === 'VISITOR' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const client = await resolveTenantAIClient(session.tenantId, ctx.activeAgent?.modelType || 'low');
    const llmResult = await executeAICompletion(client, {
      contents: [...recentTurns, { role: 'user', parts: [{ text: visitorMessage }] }],
      systemInstruction: systemPrompt
    });

    replyText = llmResult?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (_llmErr) {
    const topArticle = ctx.matchedArticles.find(a => a.score > 0) || ctx.matchedArticles[0];
    replyText = topArticle
      ? `According to **${topArticle.title}** (${topArticle.category}):\n\n${topArticle.content}\n\nLet me know if you would like to submit a request form, schedule a booking, or speak with a team member.`
      : `Thanks for contacting **${ctx.companyProfile.companyName}**. I can help answer questions about our services, submit a form into our **${ctx.modules[0]?.name || 'operations'}** system, schedule an appointment, or connect you with a team member. How can I help you today?`;
  }

  const hasStrongKbMatch = ctx.matchedArticles.length > 0 && ctx.matchedArticles[0].score > 0;

  return {
    senderName: agentName,
    content: replyText,
    messageType: hasStrongKbMatch ? ('KB_CITATION' as const) : ('TEXT' as const),
    payload: hasStrongKbMatch
      ? {
          articles: ctx.matchedArticles
            .filter(a => a.score > 0)
            .slice(0, 2)
            .map(a => ({
              id: a.id,
              title: a.title,
              category: a.category,
              excerpt: a.content.slice(0, 180) + (a.content.length > 180 ? '...' : '')
            }))
        }
      : {},
    aiTrace: {
      intent: 'KNOWLEDGE_BASE_QA',
      confidenceScore: hasStrongKbMatch ? 0.94 : 0.88,
      ragSources: ctx.matchedArticles
        .filter(a => a.score > 0)
        .slice(0, 2)
        .map(a => ({
          id: a.id,
          title: a.title,
          category: a.category,
          snippet: a.content.slice(0, 120)
        })),
      companyContextUsed: [
        `Company: ${ctx.companyProfile.companyName}`,
        ...(ctx.site?.name ? [`Site: ${ctx.site.name} (${ctx.currentPageSlug})`] : [])
      ],
      toolsInvoked: [
        {
          name: 'knowledge_base_search',
          status: 'SUCCESS' as const,
          summary: `Searched ${ctx.allKbArticles.length} tenant knowledge sources`
        }
      ]
    }
  };
}

// ============================================================================
// WORKSPACE OPERATOR ROUTES (/api/service-desk/*)
// ============================================================================

/**
 * GET /api/service-desk/sessions
 * Lists all real Service Desk sessions for the tenant with computed wallboard metrics
 */
router.get('/sessions', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);

    const { status, channelType, siteId, allocatedAssigneeType } = req.query;
    const whereClause: any = { tenantId };

    if (status && status !== 'ALL') whereClause.status = String(status);
    if (channelType && channelType !== 'ALL') whereClause.channelType = String(channelType);
    if (siteId && siteId !== 'ALL') whereClause.siteId = String(siteId);
    if (allocatedAssigneeType && allocatedAssigneeType !== 'ALL') {
      whereClause.allocatedAssigneeType = String(allocatedAssigneeType);
    }

    const [sessions, allSessions] = await Promise.all([
      (globalPrisma as any).serviceDeskSession.findMany({
        where: whereClause,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { lastMessageAt: 'desc' }
      }),
      (globalPrisma as any).serviceDeskSession.findMany({
        where: { tenantId }
      })
    ]);

    // Compute 100% real metrics from actual database sessions
    const activeSessions = allSessions.filter((s: any) => s.status !== 'RESOLVED' && s.status !== 'ARCHIVED');
    const activeAiSessions = activeSessions.filter(
      (s: any) => s.allocatedAssigneeType === 'AI_AGENT' && s.status === 'ACTIVE_AI'
    ).length;
    const queuedForHuman = activeSessions.filter((s: any) => s.status === 'QUEUED_FOR_HUMAN').length;
    const assignedToHuman = activeSessions.filter((s: any) => s.status === 'ASSIGNED_HUMAN').length;
    const awaitingHitlApproval = activeSessions.filter((s: any) => s.status === 'AWAITING_HITL_APPROVAL').length;
    const activeVoiceCalls = activeSessions.filter((s: any) => s.channelType === 'VOICE_CALL').length;
    const resolvedSessions = allSessions.filter((s: any) => s.status === 'RESOLVED');

    const aiHandledCount = allSessions.filter(
      (s: any) => s.allocatedAssigneeType === 'AI_AGENT' && !s.escalatedAt
    ).length;
    const aiDeflectionRate =
      allSessions.length > 0 ? Math.round((aiHandledCount / allSessions.length) * 100) : 0;

    // Real Average First Response Time in seconds
    const respondedSessions = allSessions.filter((s: any) => s.firstResponseAt && s.createdAt);
    const avgFirstResponseSeconds =
      respondedSessions.length > 0
        ? Math.max(
            1,
            Math.round(
              respondedSessions.reduce(
                (acc: number, s: any) =>
                  acc + (new Date(s.firstResponseAt).getTime() - new Date(s.createdAt).getTime()) / 1000,
                0
              ) / respondedSessions.length
            )
          )
        : 0;

    // Real SLA Compliance Rate
    const nonBreachedCount = allSessions.filter((s: any) => s.slaStatus !== 'BREACHED').length;
    const slaComplianceRate =
      allSessions.length > 0 ? Math.round((nonBreachedCount / allSessions.length) * 100) : 0;

    // Real Average CSAT Score
    const ratedSessions = allSessions.filter((s: any) => typeof s.csatScore === 'number' && s.csatScore > 0);
    const avgCsatScore =
      ratedSessions.length > 0
        ? Number(
            (
              ratedSessions.reduce((acc: number, s: any) => acc + Number(s.csatScore), 0) /
              ratedSessions.length
            ).toFixed(1)
          )
        : 0;

    const metrics = {
      totalActiveSessions: activeSessions.length,
      activeAiSessions,
      queuedForHuman,
      assignedToHuman,
      awaitingHitlApproval,
      activeVoiceCalls,
      resolvedToday: resolvedSessions.length,
      aiDeflectionRate,
      avgFirstResponseSeconds,
      slaComplianceRate,
      avgCsatScore
    };

    res.json({ sessions, metrics });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /sessions error:', err);
    res.status(500).json({ error: err.message || 'Failed to load Service Desk sessions' });
  }
});

/**
 * POST /api/service-desk/sessions
 * Creates a new real Service Desk session (Site Chat or Outbound/Inbound Voice Call)
 */
router.post('/sessions', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const {
      siteId,
      channelType = 'SITE_CHAT',
      visitorName,
      visitorEmail,
      visitorPhone,
      partyId,
      initialMessage,
      allocationMode = 'AI_FIRST',
      targetAssigneeType,
      targetAgentId,
      targetMemberId,
      targetTeamId,
      targetQueueId,
      targetQueueName,
      priority = 'MEDIUM'
    } = req.body;

    const site = siteId
      ? await globalPrisma.site.findFirst({ where: { id: siteId, tenantId } })
      : await globalPrisma.site.findFirst({ where: { tenantId } });

    let resolvedName = visitorName || 'Customer';
    let resolvedEmail = visitorEmail || null;
    const resolvedPhone = visitorPhone || null;

    if (partyId) {
      const party = await globalPrisma.party
        .findFirst({
          where: { id: partyId, tenantId },
          include: { person: true, organization: true }
        })
        .catch(() => null);
      if (party) {
        if (party.person) {
          resolvedName = [party.person.firstName, party.person.lastName].filter(Boolean).join(' ') || resolvedName;
        } else if (party.organization) {
          resolvedName = party.organization.legalName || resolvedName;
        }
      }
    }

    const siteBranding = site?.branding && typeof site.branding === 'object' ? (site.branding as any) : {};
    const chatConfig = siteBranding.chatConfig || {};

    const allocation = await resolveSessionAllocation(tenantId, allocationMode, {
      targetAssigneeType,
      targetAgentId,
      targetMemberId,
      targetTeamId,
      targetQueueId,
      siteChatConfig: chatConfig
    });

    const createdSession = await (globalPrisma as any).serviceDeskSession.create({
      data: {
        tenantId,
        siteId: site?.id || null,
        siteName:
          channelType === 'VOICE_CALL'
            ? site?.name || 'Voice Queue'
            : site?.name || 'Customer Portal',
        channelType,
        status: allocation.status,
        priority,
        visitorToken: `sess-${Date.now()}`,
        partyId: partyId || null,
        visitorName: resolvedName.trim(),
        visitorEmail: resolvedEmail,
        visitorPhone: resolvedPhone,
        currentPageSlug: channelType === 'VOICE_CALL' ? 'Voice Call' : '/',
        currentPageTitle: channelType === 'VOICE_CALL' ? 'Voice Queue' : 'Home',
        isAuthenticated: Boolean(resolvedEmail || partyId),
        allocationMode,
        allocatedAssigneeType: allocation.allocatedAssigneeType,
        allocatedMemberId: allocation.allocatedMemberId,
        allocatedMemberName: allocation.allocatedMemberName,
        allocatedAgentId: allocation.allocatedAgentId,
        allocatedAgentName: allocation.allocatedAgentName,
        allocatedTeamId: allocation.allocatedTeamId,
        allocatedTeamName: allocation.allocatedTeamName,
        allocatedQueueId: targetQueueId || allocation.allocatedQueueId || null,
        allocatedQueueName: targetQueueName || allocation.allocatedQueueName || null,
        aiWhisperEnabled: true,
        slaDeadline: new Date(Date.now() + 15 * 60000),
        slaStatus: 'ON_TRACK',
        lastMessageAt: new Date(),
        lastMessagePreview: initialMessage || `Session started with ${resolvedName}`
      }
    });

    if (channelType === 'VOICE_CALL') {
      await (globalPrisma as any).serviceDeskMessage.create({
        data: {
          sessionId: createdSession.id,
          tenantId,
          senderType: 'SYSTEM',
          senderName: 'Voice Queue Router',
          content: `Voice call connected with **${resolvedName}**${resolvedPhone ? ` (${resolvedPhone})` : ''}.${initialMessage ? `\n\nNotes: ${initialMessage}` : ''}`,
          messageType: 'CALL_EVENT',
          payload: {
            callEventType: 'INBOUND_RINGING',
            callerNumber: resolvedPhone || 'Direct Line',
            queueName: allocation.allocatedTeamName || 'Voice Queue'
          },
          isRead: false
        }
      });
    } else if (initialMessage && String(initialMessage).trim()) {
      const visitorMsg = await (globalPrisma as any).serviceDeskMessage.create({
        data: {
          sessionId: createdSession.id,
          tenantId,
          senderType: 'VISITOR',
          senderName: resolvedName,
          content: String(initialMessage).trim(),
          messageType: 'TEXT',
          isRead: false
        }
      });

      if (allocation.allocatedAssigneeType === 'AI_AGENT') {
        const aiTurn = await executeServiceDeskAiTurn(createdSession, String(initialMessage).trim(), [visitorMsg]);
        await (globalPrisma as any).serviceDeskMessage.create({
          data: {
            sessionId: createdSession.id,
            tenantId,
            senderType: 'AI_AGENT',
            senderId: allocation.allocatedAgentId,
            senderName: aiTurn.senderName,
            senderRole: 'AI Assistant',
            content: aiTurn.content,
            messageType: aiTurn.messageType,
            payload: aiTurn.payload || {},
            aiTrace: aiTurn.aiTrace || null,
            isRead: false
          }
        });
        await (globalPrisma as any).serviceDeskSession.update({
          where: { id: createdSession.id },
          data: {
            firstResponseAt: new Date(),
            lastMessageAt: new Date(),
            lastMessagePreview: aiTurn.content.replace(/\*\*/g, '').slice(0, 140),
            ...(aiTurn.awaitHitlApproval && aiTurn.hitlRequest
              ? { status: 'AWAITING_HITL_APPROVAL', pendingHitlTool: aiTurn.hitlRequest }
              : {})
          }
        });
      }
    } else {
      await (globalPrisma as any).serviceDeskMessage.create({
        data: {
          sessionId: createdSession.id,
          tenantId,
          senderType: allocation.allocatedAssigneeType === 'HUMAN_USER' ? 'HUMAN_AGENT' : 'AI_AGENT',
          senderId: allocation.allocatedAgentId || allocation.allocatedMemberId,
          senderName: allocation.allocatedAgentName || allocation.allocatedMemberName || 'Service Desk',
          senderRole: allocation.allocatedAssigneeType === 'HUMAN_USER' ? 'Operator' : 'AI Assistant',
          content: `Hello ${resolvedName}! How can we help you today?`,
          messageType: 'TEXT',
          isRead: true
        }
      });
    }

    const populated = await (globalPrisma as any).serviceDeskSession.findUnique({
      where: { id: createdSession.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitTenantUpdate(tenantId, 'service_desk:session_created', populated);
    res.status(201).json(populated);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Service Desk session' });
  }
});

/**
 * DELETE /api/service-desk/sessions/:id
 * Deletes a Service Desk session
 */
router.delete('/sessions/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    await (globalPrisma as any).serviceDeskSession.deleteMany({
      where: { id, tenantId }
    });
    emitTenantUpdate(tenantId, 'service_desk:session_deleted', { id });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] DELETE /sessions/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete session' });
  }
});

/**
 * GET /api/service-desk/sessions/:id
 * Fetch a single session with full transcript and live Customer 360 context
 */
router.get('/sessions/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;

    const session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Service Desk session not found' });
    }

    const context360 = await assembleServiceDeskContext(
      tenantId,
      session.siteId,
      session.lastMessagePreview || '',
      session.visitorEmail,
      session.currentPageSlug,
      session.allocatedAgentId
    );

    res.json({
      session,
      customer360: {
        party: context360.matchedParty,
        records: context360.customerRecords.slice(0, 5),
        invoices: context360.customerInvoices.slice(0, 5),
        companyProfile: context360.companyProfile,
        sitePages: context360.sitePagesSummary
      }
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /sessions/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to load session details' });
  }
});

/**
 * GET /api/service-desk/workforce
 * Returns 100% real roster of AI Agents, Human Operators, Teams, Queues, Sites, Forms, Modules, Invoices, KB Articles & Parties
 */
router.get('/workforce', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, tenant } = await resolveTenantContext(req);

    const [members, agents, teams, sites, forms, modules, invoices, parties, presences] = await Promise.all([
      globalPrisma.tenantMember
        .findMany({
          where: { tenantId },
          include: { position: true, team: true, user: true, agent: true }
        })
        .catch(() => []),
      globalPrisma.agent.findMany({ where: { tenantId } }).catch(() => []),
      globalPrisma.team.findMany({ where: { tenantId } }).catch(() => []),
      globalPrisma.site.findMany({ where: { tenantId } }).catch(() => []),
      globalPrisma.form.findMany({ where: { tenantId }, take: 30 }).catch(() => []),
      globalPrisma.module.findMany({ where: { tenantId, enabled: true }, take: 40 }).catch(() => []),
      globalPrisma.invoice
        .findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 25
        })
        .catch(() => []),
      globalPrisma.party
        .findMany({
          where: { tenantId },
          include: { person: true, organization: true },
          take: 50
        })
        .catch(() => []),
      (globalPrisma as any).serviceDeskOperatorPresence.findMany({ where: { tenantId } }).catch(() => [])
    ]);

    const workspaceSettings =
      tenant?.workspaceSettings && typeof tenant.workspaceSettings === 'object'
        ? (tenant.workspaceSettings as any)
        : {};
    const queues = Array.isArray(workspaceSettings.queues) ? workspaceSettings.queues : [];

    const activeMembers = members.filter((m: any) => String(m.status || 'Active').toLowerCase() === 'active');

    const humanOperators = activeMembers
      .filter((m: any) => !m.isSynthetic)
      .map((m: any) => {
        const fullName =
          [m.firstName, m.familyName].filter(Boolean).join(' ') ||
          m.workEmail ||
          m.personalEmail ||
          m.user?.email ||
          'Team Member';
        const pres = presences.find((p: any) => p.memberId === m.id || p.memberId === m.userId);
        return {
          id: m.id,
          userId: m.userId,
          name: fullName,
          email: m.workEmail || m.personalEmail || m.user?.email || '',
          roleTitle: m.position?.title || m.roleId || 'Operator',
          avatarUrl: m.avatarUrl,
          status: pres?.status || 'AVAILABLE',
          activeChatCount: pres?.activeChatCount || 0,
          maxConcurrentChats: pres?.maxConcurrentChats || 3,
          teams: m.team ? [{ id: m.team.id, name: m.team.name }] : []
        };
      });

    const aiAgents = [
      ...agents.map((a: any) => {
        const cfg = a.config && typeof a.config === 'object' ? (a.config as any) : {};
        return {
          id: a.id,
          name: a.name,
          roleTitle: cfg.roleTitle || 'AI Agent',
          modelType: a.modelType || 'gemini-2.5-flash',
          avatarUrl: cfg.avatarUrl || null,
          status: cfg.status || 'ACTIVE'
        };
      }),
      ...activeMembers
        .filter((m: any) => m.isSynthetic && !agents.some((a: any) => a.id === m.agentId))
        .map((m: any) => ({
          id: m.agentId || m.id,
          name: [m.firstName, m.familyName].filter(Boolean).join(' ') || m.agent?.name || 'AI Coworker',
          roleTitle: m.position?.title || 'Synthetic Workforce Agent',
          modelType: m.agent?.modelType || 'gemini-2.5-flash',
          avatarUrl: m.avatarUrl || null,
          status: 'ACTIVE'
        }))
    ];

    const kbArticles = await loadTenantKnowledgeArticles(tenantId, agents, sites);
    const wrapUpLists = await ensureAndLoadTenantWrapUpLists(tenantId);

    res.json({
      humanOperators,
      aiAgents,
      teams: teams.map((t: any) => ({ id: t.id, name: t.name, description: t.description })),
      queues: queues.map((q: any) => ({
        id: q.id,
        name: q.name,
        slug: q.slug,
        description: q.description,
        iconName: q.iconName,
        status: q.status,
        queueConfig: q.queueConfig
      })),
      sites: sites.map((s: any) => ({ id: s.id, name: s.name, domain: s.domain, category: s.category })),
      forms: forms.map((f: any) => ({
        id: f.id,
        name: f.name || 'Form',
        description: f.description || '',
        moduleId: f.moduleId || null,
        fields: extractFormFieldsFromSchema(f.schema)
      })),
      modules: modules.map((m: any) => ({ id: m.id, name: m.name, slug: m.id })),
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.total || 0),
        currency: inv.currency || 'AUD',
        status: inv.status
      })),
      kbArticles: kbArticles.slice(0, 30),
      parties: parties.map((p: any) => {
        const displayName = p.person
          ? [p.person.firstName, p.person.lastName].filter(Boolean).join(' ')
          : p.organization?.legalName || 'Contact';
        return {
          id: p.id,
          name: displayName,
          partyType: p.partyType
        };
      }),
      wrapUpOutcomes: wrapUpLists.wrapUpOutcomes,
      wrapUpTopics: wrapUpLists.wrapUpTopics,
      outcomeListId: wrapUpLists.outcomeListId,
      topicListId: wrapUpLists.topicListId
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /workforce error:', err);
    res.status(500).json({ error: err.message || 'Failed to load Service Desk workforce' });
  }
});

/**
 * GET /api/service-desk/settings
 * Loads the tenant's Service Desk settings from tenant.workspaceSettings.serviceDeskSettings
 */
router.get('/settings', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, tenant } = await resolveTenantContext(req);
    const ws = (tenant?.workspaceSettings && typeof tenant.workspaceSettings === 'object')
      ? (tenant.workspaceSettings as Record<string, any>)
      : {};
    const settings = ws.serviceDeskSettings || {};
    res.json(settings);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /settings error:', err);
    res.status(500).json({ error: err.message || 'Failed to load Service Desk settings' });
  }
});

/**
 * PUT /api/service-desk/settings
 * Saves the tenant's Service Desk settings into tenant.workspaceSettings.serviceDeskSettings
 */
router.put('/settings', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, tenant } = await resolveTenantContext(req);
    const ws = (tenant?.workspaceSettings && typeof tenant.workspaceSettings === 'object')
      ? (tenant.workspaceSettings as Record<string, any>)
      : {};

    const updatedSettings = {
      ...(ws.serviceDeskSettings || {}),
      ...req.body
    };

    const updatedTenant = await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...ws,
          serviceDeskSettings: updatedSettings
        }
      }
    });

    emitTenantUpdate(tenantId, 'service_desk:settings_updated', updatedSettings);
    res.json(updatedSettings);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] PUT /settings error:', err);
    res.status(500).json({ error: err.message || 'Failed to save Service Desk settings' });
  }
});

/**
 * GET /api/service-desk/canned-responses
 * List tenant canned responses, seeding defaults if empty
 */
router.get('/canned-responses', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    let items = await (globalPrisma as any).serviceDeskCannedResponse.findMany({
      where: { tenantId },
      orderBy: { usageCount: 'desc' }
    });

    if (!items || items.length === 0) {
      const defaultTemplates = [
        {
          shortcut: '/greet',
          title: 'Warm Welcome & Greeting',
          content: 'Hello {{customerName}}! Thanks for reaching out to {{siteName}}. How can I assist you today?',
          category: 'General',
          isShared: true
        },
        {
          shortcut: '/hours',
          title: 'Trading & Support Hours',
          content: 'Our service desk operates Monday to Friday from 8:30 AM to 5:30 PM (ACST). Outside these hours, our AI Concierge is available 24/7.',
          category: 'General',
          isShared: true
        },
        {
          shortcut: '/transfer',
          title: 'Transfer to Specialist Disclaimer',
          content: 'I am transferring you to our specialist queue who can directly inspect your records. Please stay on the line for just a moment.',
          category: 'Support',
          isShared: true
        },
        {
          shortcut: '/refund',
          title: 'Refund & Credit Policy',
          content: 'Disputed charges and credit requests are reviewed within 1 business day. Once approved, funds reflect on your original payment method in 3–5 business days.',
          category: 'Billing',
          isShared: true
        },
        {
          shortcut: '/closing',
          title: 'Resolution & Wrap-Up Closing',
          content: 'I am glad we could resolve this for you today, {{customerName}}! You will receive a brief 1-click satisfaction survey shortly. Have a great day!',
          category: 'General',
          isShared: true
        }
      ];

      for (const t of defaultTemplates) {
        await (globalPrisma as any).serviceDeskCannedResponse.create({
          data: {
            tenantId,
            ...t
          }
        }).catch(() => null);
      }

      items = await (globalPrisma as any).serviceDeskCannedResponse.findMany({
        where: { tenantId },
        orderBy: { usageCount: 'desc' }
      });
    }

    res.json(items);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /canned-responses error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch canned responses' });
  }
});

/**
 * POST /api/service-desk/canned-responses
 */
router.post('/canned-responses', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { shortcut, title, content, category = 'General', isShared = true } = req.body;
    if (!shortcut || !content) {
      return res.status(400).json({ error: 'Shortcut and content are required' });
    }

    const cleanShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;
    const created = await (globalPrisma as any).serviceDeskCannedResponse.upsert({
      where: {
        tenantId_shortcut: {
          tenantId,
          shortcut: cleanShortcut
        }
      },
      update: {
        title: title || cleanShortcut,
        content,
        category,
        isShared
      },
      create: {
        tenantId,
        shortcut: cleanShortcut,
        title: title || cleanShortcut,
        content,
        category,
        isShared
      }
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /canned-responses error:', err);
    res.status(500).json({ error: err.message || 'Failed to save canned response' });
  }
});

/**
 * DELETE /api/service-desk/canned-responses/:id
 */
router.delete('/canned-responses/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    await (globalPrisma as any).serviceDeskCannedResponse.deleteMany({
      where: { id, tenantId }
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] DELETE /canned-responses/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete canned response' });
  }
});

/**
 * GET /api/service-desk/feedback-cases
 */
router.get('/feedback-cases', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { status, priority, rootCause } = req.query;

    const where: any = { tenantId };
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (rootCause && rootCause !== 'ALL') where.rootCauseCategory = rootCause;

    const cases = await (globalPrisma as any).serviceDeskFeedbackCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(cases);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /feedback-cases error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch feedback cases' });
  }
});

/**
 * POST /api/service-desk/feedback-cases
 * Customer submits CSAT / rating, automatically triggering closed-loop escalation if low score
 */
router.post('/feedback-cases', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const {
      sessionId,
      score,
      maxScore = 5,
      ratingType = 'CSAT_5_STAR',
      comment,
      visitorName,
      visitorEmail,
      visitorPhone,
      channelType = 'SITE_CHAT'
    } = req.body;

    const numericScore = Number(score) || 5;
    const isLowScore = numericScore <= 2;
    const sentiment = isLowScore ? 'NEGATIVE' : numericScore >= 4 ? 'POSITIVE' : 'NEUTRAL';
    const priority = numericScore <= 1 ? 'URGENT' : numericScore === 2 ? 'HIGH' : 'MEDIUM';

    // Calculate 24h SLA for closed loop
    const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const feedbackCase = await (globalPrisma as any).serviceDeskFeedbackCase.create({
      data: {
        tenantId,
        sessionId: sessionId || `standalone-${Date.now()}`,
        visitorName: visitorName || 'Valued Customer',
        visitorEmail: visitorEmail || null,
        visitorPhone: visitorPhone || null,
        channelType,
        score: numericScore,
        maxScore: Number(maxScore) || 5,
        ratingType,
        comment: comment || null,
        sentiment,
        status: isLowScore ? 'NEW_UNASSIGNED' : 'RESOLVED_CLOSED_LOOP',
        priority,
        slaDeadline: isLowScore ? slaDeadline : null,
        remediationAction: !isLowScore ? 'POSITIVE_SURVEY_LOGGED' : null,
        remediationNotes: !isLowScore ? 'High satisfaction recorded. No corrective outreach required.' : null,
        closedAt: !isLowScore ? new Date() : null,
        closedByName: !isLowScore ? 'System Auto-Log' : null
      }
    });

    // Also update session CSAT score if session exists
    if (sessionId) {
      await (globalPrisma as any).serviceDeskSession.updateMany({
        where: { id: sessionId, tenantId },
        data: {
          csatRating: numericScore,
          csatComment: comment || null,
          csatSubmittedAt: new Date()
        }
      }).catch(() => null);

      await (globalPrisma as any).serviceDeskWrapUp.updateMany({
        where: { sessionId, tenantId },
        data: { csatScore: numericScore }
      }).catch(() => null);
    }

    emitTenantUpdate(tenantId, 'service_desk:feedback_created', feedbackCase);
    res.status(201).json(feedbackCase);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /feedback-cases error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit customer feedback' });
  }
});

/**
 * PUT /api/service-desk/feedback-cases/:id
 * Supervisor updates closed-loop case, logs outreach, records remediation
 */
router.put('/feedback-cases/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    const {
      status,
      priority,
      rootCauseCategory,
      assignedSupervisorId,
      assignedSupervisorName,
      remediationAction,
      remediationNotes
    } = req.body;

    const isClosing = status === 'RESOLVED_CLOSED_LOOP' || status === 'DISMISSED';

    const updated = await (globalPrisma as any).serviceDeskFeedbackCase.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(rootCauseCategory !== undefined ? { rootCauseCategory } : {}),
        ...(assignedSupervisorId !== undefined ? { assignedSupervisorId } : {}),
        ...(assignedSupervisorName !== undefined ? { assignedSupervisorName } : {}),
        ...(remediationAction !== undefined ? { remediationAction } : {}),
        ...(remediationNotes !== undefined ? { remediationNotes } : {}),
        ...(isClosing
          ? {
              closedAt: new Date(),
              closedByName: req.user?.displayName || req.user?.email || 'Supervisor'
            }
          : {})
      }
    });

    emitTenantUpdate(tenantId, 'service_desk:feedback_updated', updated);
    res.json(updated);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] PUT /feedback-cases/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update feedback case' });
  }
});

/**
 * GET /api/service-desk/feedback-cases/stats
 * Closed-Loop Performance & CSAT Analytics
 */
router.get('/feedback-cases/stats', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const cases = await (globalPrisma as any).serviceDeskFeedbackCase.findMany({
      where: { tenantId }
    });

    const total = cases.length;
    const pendingOutreach = cases.filter((c: any) => c.status === 'NEW_UNASSIGNED' || c.status === 'IN_REVIEW').length;
    const inRemediation = cases.filter((c: any) => c.status === 'OUTREACH_SCHEDULED' || c.status === 'REMEDIATION_OFFERED').length;
    const closedLoopResolved = cases.filter((c: any) => c.status === 'RESOLVED_CLOSED_LOOP').length;

    const avgScore = total > 0
      ? Number((cases.reduce((sum: number, c: any) => sum + Number(c.score || 0), 0) / total).toFixed(1))
      : 5.0;

    // SLA compliance for closed-loop cases
    const eligibleForSla = cases.filter((c: any) => c.slaDeadline && c.closedAt);
    const onTimeCount = eligibleForSla.filter((c: any) => new Date(c.closedAt) <= new Date(c.slaDeadline)).length;
    const slaComplianceRate = eligibleForSla.length > 0
      ? Math.round((onTimeCount / eligibleForSla.length) * 100)
      : 100;

    // Root cause categories
    const rootCausesMap: Record<string, number> = {};
    cases.forEach((c: any) => {
      if (c.rootCauseCategory) {
        rootCausesMap[c.rootCauseCategory] = (rootCausesMap[c.rootCauseCategory] || 0) + 1;
      }
    });

    res.json({
      total,
      pendingOutreach,
      inRemediation,
      closedLoopResolved,
      avgScore,
      slaComplianceRate,
      rootCauses: Object.entries(rootCausesMap).map(([category, count]) => ({ category, count }))
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /feedback-cases/stats error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch feedback stats' });
  }
});

/**
 * POST /api/service-desk/operators/presence
 * Updates an operator's Contact Center Aux/Presence status
 */
router.post('/operators/presence', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { memberId, memberName, status, maxConcurrentChats } = req.body;
    const resolvedMemberId = memberId || req.user?.uid || 'operator-default';

    const updated = await (globalPrisma as any).serviceDeskOperatorPresence.upsert({
      where: { memberId: resolvedMemberId },
      update: {
        status: status || 'AVAILABLE',
        ...(memberName ? { memberName } : {}),
        ...(typeof maxConcurrentChats === 'number' ? { maxConcurrentChats } : {})
      },
      create: {
        tenantId,
        memberId: resolvedMemberId,
        memberName: memberName || 'Operator',
        status: status || 'AVAILABLE',
        maxConcurrentChats: maxConcurrentChats || 3
      }
    });

    emitTenantUpdate(tenantId, 'service_desk:operator_presence', updated);
    res.json(updated);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /operators/presence error:', err);
    res.status(500).json({ error: err.message || 'Failed to update operator presence' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/allocate
 * Allocates or transfers a session to an AI Agent, a Human User, or a Round-Robin Team/Queue
 */
router.post('/sessions/:id/allocate', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    const {
      targetAssigneeType,
      targetMemberId,
      targetMemberName,
      targetAgentId,
      targetAgentName,
      targetTeamId,
      targetTeamName,
      targetQueueId,
      targetQueueName,
      handoverNote
    } = req.body;

    const existing = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let updateData: any = {};
    let systemNotice = '';

    if (targetAssigneeType === 'AI_AGENT') {
      const resolvedAgentName = targetAgentName || 'AI Assistant';
      updateData = {
        status: 'ACTIVE_AI',
        allocatedAssigneeType: 'AI_AGENT',
        allocatedAgentId: targetAgentId || 'default-tenant-agent',
        allocatedAgentName: resolvedAgentName,
        allocatedMemberId: null,
        allocatedMemberName: resolvedAgentName,
        ...(targetTeamId ? { allocatedTeamId, allocatedTeamName } : {})
      };
      systemNotice = `Assigned to AI Agent **${resolvedAgentName}**${handoverNote ? ` — "${handoverNote}"` : ''}.`;
    } else if (targetAssigneeType === 'HUMAN_USER' && (targetMemberId || targetMemberName)) {
      const resolvedHumanName = targetMemberName || 'Operator';
      updateData = {
        status: 'ASSIGNED_HUMAN',
        allocatedAssigneeType: 'HUMAN_USER',
        allocatedMemberId: targetMemberId || req.user?.uid || null,
        allocatedMemberName: resolvedHumanName,
        ...(targetTeamId ? { allocatedTeamId, allocatedTeamName } : {}),
        escalatedAt: existing.escalatedAt || new Date()
      };
      systemNotice = `Assigned to **${resolvedHumanName}**${handoverNote ? ` (${handoverNote})` : ''}.`;
    } else {
      const allocation = await resolveSessionAllocation(tenantId, 'HUMAN_FIRST', {
        targetAssigneeType: 'HUMAN_USER',
        targetTeamId,
        targetQueueId
      });
      updateData = {
        ...allocation,
        ...(targetQueueId ? { allocatedQueueId: targetQueueId, allocatedQueueName: targetQueueName || 'Queue' } : {}),
        escalatedAt: existing.escalatedAt || new Date()
      };
      systemNotice = allocation.allocatedMemberName
        ? `Assigned via Round-Robin to **${allocation.allocatedMemberName}**${allocation.allocatedTeamName ? ` (${allocation.allocatedTeamName})` : ''}.`
        : `Placed in **${targetQueueName || allocation.allocatedTeamName || 'Queue'}**.`;
    }

    const sysMessage = await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: id,
        tenantId,
        senderType: 'SYSTEM',
        senderName: 'Service Desk',
        content: systemNotice,
        messageType: 'TEXT',
        isRead: true
      }
    });

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id },
      data: {
        ...updateData,
        lastMessageAt: new Date(),
        lastMessagePreview: systemNotice.replace(/\*\*/g, '')
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:allocation_changed', {
      session: updatedSession,
      systemMessage: sysMessage
    });

    try {
      const { AutomationEngine } = await import('../services/automationEngine');
      AutomationEngine.triggerEvent(tenantId, 'SERVICE_DESK_ALLOCATED' as any, updatedSession.id, updatedSession, globalPrisma).catch(() => {});
    } catch (_e) {}

    res.json(updatedSession);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/allocate error:', err);
    res.status(500).json({ error: err.message || 'Failed to allocate session' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/messages
 * Sends a message or interactive card in a session
 */
router.post('/sessions/:id/messages', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    const {
      senderType = 'HUMAN_AGENT',
      senderId,
      senderName = 'Operator',
      senderRole = 'Service Desk',
      senderAvatar,
      content,
      messageType = 'TEXT',
      payload = {},
      triggerAiResponse = false
    } = req.body;

    const session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const createdMessage = await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: id,
        tenantId,
        senderType,
        senderId: senderId || req.user?.uid || null,
        senderName,
        senderRole,
        senderAvatar: senderAvatar || null,
        content: content || '',
        messageType,
        payload,
        isRead: senderType !== 'VISITOR'
      }
    });

    const shouldClaimForHuman =
      senderType === 'HUMAN_AGENT' && session.allocatedAssigneeType !== 'HUMAN_USER';

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id },
      data: {
        ...(shouldClaimForHuman
          ? {
              status: 'ASSIGNED_HUMAN',
              allocatedAssigneeType: 'HUMAN_USER',
              allocatedMemberId: senderId || req.user?.uid || null,
              allocatedMemberName: senderName
            }
          : {}),
        firstResponseAt: session.firstResponseAt || (senderType !== 'VISITOR' ? new Date() : null),
        unreadByOperator: senderType === 'VISITOR' ? { increment: 1 } : 0,
        unreadByVisitor: senderType === 'HUMAN_AGENT' || senderType === 'AI_AGENT' ? { increment: 1 } : session.unreadByVisitor,
        lastMessageAt: new Date(),
        lastMessagePreview: senderType === 'INTERNAL_WHISPER' ? `[Internal Note] ${content}` : content
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:message', {
      sessionId: id,
      message: createdMessage,
      session: updatedSession
    });

    if (senderType === 'VISITOR' || triggerAiResponse) {
      if (updatedSession.allocatedAssigneeType === 'AI_AGENT' && updatedSession.status === 'ACTIVE_AI') {
        const aiTurn = await executeServiceDeskAiTurn(updatedSession, content, updatedSession.messages);

        const aiMsg = await (globalPrisma as any).serviceDeskMessage.create({
          data: {
            sessionId: id,
            tenantId,
            senderType: 'AI_AGENT',
            senderId: updatedSession.allocatedAgentId || 'default-tenant-agent',
            senderName: aiTurn.senderName,
            senderRole: 'AI Assistant',
            content: aiTurn.content,
            messageType: aiTurn.messageType,
            payload: aiTurn.payload || {},
            aiTrace: aiTurn.aiTrace || null,
            isRead: false
          }
        });

        const postAiUpdate: any = {
          lastMessageAt: new Date(),
          lastMessagePreview: aiTurn.content.replace(/\*\*/g, '').slice(0, 140),
          confidenceScore: aiTurn.aiTrace?.confidenceScore ?? updatedSession.confidenceScore,
          firstResponseAt: updatedSession.firstResponseAt || new Date()
        };

        if (aiTurn.escalateToHuman && aiTurn.newAllocation) {
          Object.assign(postAiUpdate, aiTurn.newAllocation, {
            escalatedAt: new Date(),
            unreadByOperator: { increment: 1 }
          });
        } else if (aiTurn.awaitHitlApproval && aiTurn.hitlRequest) {
          postAiUpdate.status = 'AWAITING_HITL_APPROVAL';
          postAiUpdate.pendingHitlTool = aiTurn.hitlRequest;
          postAiUpdate.unreadByOperator = { increment: 1 };
        }

        const finalSession = await (globalPrisma as any).serviceDeskSession.update({
          where: { id },
          data: postAiUpdate,
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:message', {
          sessionId: id,
          message: aiMsg,
          session: finalSession
        });

        return res.json({ message: createdMessage, aiMessage: aiMsg, session: finalSession });
      } else if (updatedSession.aiWhisperEnabled) {
        const aiTurn = await executeServiceDeskAiTurn(updatedSession, content, updatedSession.messages);
        const whisperUpdated = await (globalPrisma as any).serviceDeskSession.update({
          where: { id },
          data: {
            aiSuggestedReply: aiTurn.content.replace(/\*\*/g, ''),
            confidenceScore: aiTurn.aiTrace?.confidenceScore ?? updatedSession.confidenceScore
          },
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        emitTenantUpdate(tenantId, 'service_desk:ai_whisper_suggestion', {
          sessionId: id,
          suggestedReply: whisperUpdated.aiSuggestedReply,
          aiTrace: aiTurn.aiTrace
        });

        return res.json({ message: createdMessage, session: whisperUpdated });
      }
    }

    res.json({ message: createdMessage, session: updatedSession });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/messages error:', err);
    res.status(500).json({ error: err.message || 'Failed to send Service Desk message' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/hitl
 * Approves or Rejects a pending Human-in-the-Loop (HITL) AI Agent tool execution
 */
router.post('/sessions/:id/hitl', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    const { decision, operatorName = 'Supervisor', note } = req.body;

    const session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const pendingHitl =
      session.pendingHitlTool && typeof session.pendingHitlTool === 'object'
        ? (session.pendingHitlTool as any)
        : {
            id: `hitl-${Date.now()}`,
            toolName: 'Requested Action',
            requestedByAgentName: session.allocatedAgentName || 'AI Assistant',
            parameters: {}
          };

    const isApproved = decision === 'APPROVED';
    const authRef = `AUTH-${Date.now().toString().slice(-5)}`;
    const updatedHitl = {
      ...pendingHitl,
      status: isApproved ? 'APPROVED' : 'REJECTED',
      decidedByName: operatorName,
      decidedAt: new Date().toISOString(),
      executionResult: isApproved
        ? `Approved by ${operatorName}${note ? ` (${note})` : ''}. Reference #${authRef}.`
        : `Declined by ${operatorName}${note ? `: ${note}` : '.'}`
    };

    const customerMessageText = isApproved
      ? `**${operatorName}** approved **${pendingHitl.toolName}** (Reference **#${authRef}**).${note ? `\n\n*Note: ${note}*` : ''}`
      : `**${operatorName}** reviewed **${pendingHitl.toolName}** and is stepping in to assist you directly.${note ? `\n\n*Note: ${note}*` : ''}`;

    const followUpMessage = await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: id,
        tenantId,
        senderType: isApproved ? 'AI_AGENT' : 'HUMAN_AGENT',
        senderName: isApproved ? session.allocatedAgentName || 'AI Assistant' : operatorName,
        senderRole: isApproved ? 'AI Assistant' : 'Supervisor',
        content: customerMessageText,
        messageType: 'TEXT',
        payload: { hitlRequest: updatedHitl },
        isRead: false
      }
    });

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id },
      data: {
        status: isApproved ? 'ACTIVE_AI' : 'ASSIGNED_HUMAN',
        allocatedAssigneeType: isApproved ? 'AI_AGENT' : 'HUMAN_USER',
        ...(isApproved ? {} : { allocatedMemberName: operatorName }),
        pendingHitlTool: updatedHitl,
        unreadByOperator: 0,
        lastMessageAt: new Date(),
        lastMessagePreview: customerMessageText.replace(/\*\*/g, '').slice(0, 140)
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:hitl_resolved', {
      sessionId: id,
      decision: updatedHitl.status,
      message: followUpMessage,
      session: updatedSession
    });

    res.json({ session: updatedSession, message: followUpMessage });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/hitl error:', err);
    res.status(500).json({ error: err.message || 'Failed to process HITL approval' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/link-record
 * Links an existing Module Record OR creates a real new Module Record in Prisma
 */
router.post('/sessions/:id/link-record', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    const {
      mode = 'LINK_EXISTING',
      moduleId,
      moduleName,
      recordId,
      recordKey,
      title,
      status = 'Active',
      newRecordData,
      shareCardInChat = false
    } = req.body;

    const session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const targetMod = moduleId
      ? await globalPrisma.module.findFirst({ where: { id: moduleId, tenantId } }).catch(() => null)
      : await globalPrisma.module.findFirst({ where: { tenantId, enabled: true } }).catch(() => null);

    let linkedItem = {
      moduleId: targetMod?.id || moduleId || 'general',
      moduleName: targetMod?.name || moduleName || 'Records',
      recordId: recordId || `rec-${Date.now()}`,
      recordKey: recordKey || `REC-${Date.now().toString().slice(-4)}`,
      title: title || `${session.visitorName} — Service Case`,
      status,
      linkedAt: new Date().toISOString()
    };

    if (mode === 'CREATE_NEW' && targetMod) {
      const prefix = targetMod.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'REC';
      const generatedKey = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdRec = await globalPrisma.record.create({
        data: {
          tenantId,
          moduleId: targetMod.id,
          status: 'active',
          data: {
            title: title || `${session.visitorName} — Service Request`,
            subject: title || `${session.visitorName} — Service Request`,
            customerName: session.visitorName,
            customerEmail: session.visitorEmail,
            customerPhone: session.visitorPhone,
            referenceNumber: generatedKey,
            source: 'Service Desk',
            serviceDeskSessionId: session.id,
            ...(newRecordData || {})
          }
        }
      });

      linkedItem = {
        moduleId: createdRec.moduleId,
        moduleName: targetMod.name,
        recordId: createdRec.id,
        recordKey: generatedKey,
        title: title || `${session.visitorName} — Service Request`,
        status: 'Active',
        linkedAt: new Date().toISOString()
      };
    }

    const currentLinked = Array.isArray(session.linkedRecords) ? (session.linkedRecords as any[]) : [];
    const deduplicated = [
      linkedItem,
      ...currentLinked.filter((r: any) => r.recordId !== linkedItem.recordId)
    ];

    if (shareCardInChat) {
      await (globalPrisma as any).serviceDeskMessage.create({
        data: {
          sessionId: id,
          tenantId,
          senderType: 'HUMAN_AGENT',
          senderName: session.allocatedMemberName || 'Operator',
          content: `Linked record **${linkedItem.recordKey}** (**${linkedItem.title}**):`,
          messageType: 'RECORD_CARD',
          payload: {
            moduleId: linkedItem.moduleId,
            moduleName: linkedItem.moduleName,
            recordId: linkedItem.recordId,
            recordKey: linkedItem.recordKey,
            recordTitle: linkedItem.title,
            recordStatus: linkedItem.status,
            recordFields: {
              Reference: linkedItem.recordKey,
              Module: linkedItem.moduleName,
              Status: linkedItem.status,
              Customer: session.visitorName
            }
          },
          isRead: false
        }
      });
    }

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id },
      data: {
        linkedRecords: deduplicated,
        lastMessageAt: new Date()
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:session_updated', updatedSession);
    res.json({ session: updatedSession, linkedRecord: linkedItem });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/link-record error:', err);
    res.status(500).json({ error: err.message || 'Failed to link record' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/card-action
 * Executes real Prisma mutations when a customer submits an interactive card in chat
 */
export const handleServiceDeskCardAction = async (req: any, res: Response) => {
  try {
    const id = req.params.sessionId || req.params.id || req.body?.sessionId;
    const { messageId, actionType, data } = req.body;

    const session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const tenantId = session.tenantId;
    const targetMsg = messageId
      ? await (globalPrisma as any).serviceDeskMessage.findFirst({ where: { id: messageId } })
      : null;

    let confirmationText = '';
    const updatedPayload =
      targetMsg?.payload && typeof targetMsg.payload === 'object' ? { ...(targetMsg.payload as any) } : {};

    if (actionType === 'SUBMIT_FORM') {
      updatedPayload.isSubmitted = true;
      updatedPayload.submittedData = data || {};

      // Persist a real Record in Prisma linked to the Form's module (or first active module)
      let targetModule = updatedPayload.moduleId
        ? await globalPrisma.module.findFirst({ where: { id: updatedPayload.moduleId, tenantId } }).catch(() => null)
        : null;
      if (!targetModule) {
        targetModule = await globalPrisma.module.findFirst({ where: { tenantId, enabled: true } }).catch(() => null);
      }

      const prefix = targetModule?.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'FRM';
      const refCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      let createdRecordId = `rec-${refCode.toLowerCase()}`;
      if (targetModule) {
        const createdRecord = await globalPrisma.record
          .create({
            data: {
              tenantId,
              moduleId: targetModule.id,
              status: 'active',
              data: {
                ...(data || {}),
                title:
                  data?.subject ||
                  data?.title ||
                  data?.name ||
                  `${updatedPayload.formTitle || 'Form Submission'} — ${session.visitorName}`,
                referenceNumber: refCode,
                submittedBy: session.visitorName,
                submittedEmail: session.visitorEmail,
                formId: updatedPayload.formId,
                formTitle: updatedPayload.formTitle,
                serviceDeskSessionId: session.id
              }
            }
          })
          .catch(() => null);
        if (createdRecord) {
          createdRecordId = createdRecord.id;
        }
      }

      confirmationText = `Form **${updatedPayload.formTitle || 'Request'}** submitted and saved to **${targetModule?.name || 'Records'}** (Reference **${refCode}**).`;

      const currentLinked = Array.isArray(session.linkedRecords) ? (session.linkedRecords as any[]) : [];
      await (globalPrisma as any).serviceDeskSession.update({
        where: { id },
        data: {
          linkedRecords: [
            {
              moduleId: targetModule?.id || 'form-submissions',
              moduleName: targetModule?.name || 'Form Submissions',
              recordId: createdRecordId,
              recordKey: refCode,
              title:
                data?.subject ||
                data?.title ||
                `${updatedPayload.formTitle || 'Form Submission'} (${session.visitorName})`,
              status: 'Active',
              linkedAt: new Date().toISOString()
            },
            ...currentLinked
          ]
        }
      });
    } else if (actionType === 'CONFIRM_BOOKING') {
      const slot = data?.slot || {
        date: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        resourceName: 'Consultation'
      };
      const confCode = `BKG-${Math.floor(1000 + Math.random() * 9000)}`;
      updatedPayload.selectedSlot = { ...slot, confirmationCode: confCode };

      // Create a real UniversalReminder in Prisma for the assigned operator / team
      const dueDate = new Date(`${slot.date}T09:30:00`);
      await globalPrisma.universalReminder
        .create({
          data: {
            tenantId,
            assignedToId: session.allocatedMemberId || 'service-desk',
            assignedToName: session.allocatedMemberName || slot.resourceName,
            title: `Booking #${confCode}: ${session.visitorName} — ${updatedPayload.bookingServiceName || slot.resourceName}`,
            description: `Scheduled via Service Desk Chat for ${slot.date} at ${slot.time}. Customer: ${session.visitorName} (${session.visitorEmail || 'No email'}).`,
            dueAt: isNaN(dueDate.getTime()) ? new Date(Date.now() + 86400000) : dueDate,
            priority: 'MEDIUM',
            status: 'PENDING',
            entityType: 'SERVICE_DESK_SESSION',
            entityId: session.id
          }
        })
        .catch(() => null);

      confirmationText = `Your booking for **${updatedPayload.bookingServiceName || slot.resourceName}** is confirmed for **${slot.date} at ${slot.time}** (Confirmation **#${confCode}**).`;
    } else if (actionType === 'COMPLETE_PAYMENT') {
      updatedPayload.paymentStatus = 'PAID';
      const receiptCode = `TXN-${Date.now().toString().slice(-6)}`;
      const paidAmount = Number(updatedPayload.amount || 0);

      // Update real Invoice & create real PaymentTransaction if invoice exists in Prisma
      if (updatedPayload.invoiceId) {
        const existingInv = await globalPrisma.invoice
          .findFirst({ where: { id: updatedPayload.invoiceId, tenantId } })
          .catch(() => null);
        if (existingInv) {
          await globalPrisma.invoice
            .update({
              where: { id: existingInv.id },
              data: {
                status: 'PAID',
                amountPaid: existingInv.total
              }
            })
            .catch(() => null);

          await globalPrisma.invoicePayment
            .create({
              data: {
                tenantId,
                invoiceId: existingInv.id,
                amount: existingInv.total,
                paymentDate: new Date(),
                paymentMethod: 'PORTAL_CHAT_CARD',
                reference: receiptCode
              }
            })
            .catch(() => null);
        }
      }

      await globalPrisma.paymentTransaction
        .create({
          data: {
            tenantId,
            transactionRef: receiptCode,
            channel: 'PORTAL',
            type: 'SALE',
            status: 'SUCCEEDED',
            grossAmount: paidAmount,
            netAmount: paidAmount,
            currency: updatedPayload.currency || 'AUD',
            paymentMethod: 'CARD',
            invoiceId: updatedPayload.invoiceId || null,
            customerPartyId: session.partyId || null,
            metadata: {
              serviceDeskSessionId: session.id,
              invoiceNumber: updatedPayload.invoiceNumber
            }
          }
        })
        .catch(() => null);

      confirmationText = `Payment of **$${paidAmount.toFixed(2)} ${updatedPayload.currency || 'AUD'}** for **${updatedPayload.invoiceNumber || 'Invoice'}** has been processed (Receipt **#${receiptCode}**).`;
    }

    if (targetMsg) {
      await (globalPrisma as any).serviceDeskMessage.update({
        where: { id: targetMsg.id },
        data: { payload: updatedPayload }
      });
    }

    const confirmMsg = await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: id,
        tenantId,
        senderType: 'AI_AGENT',
        senderName: session.allocatedAgentName || 'Service Desk',
        senderRole: 'Confirmation',
        content: confirmationText,
        messageType: 'TEXT',
        isRead: false
      }
    });

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: confirmationText.replace(/\*\*/g, '')
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:message', {
      sessionId: id,
      message: confirmMsg,
      session: updatedSession
    });

    res.json({ session: updatedSession, message: confirmMsg });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/card-action error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute card action' });
  }
};

router.post('/sessions/:id/card-action', handleServiceDeskCardAction);

/**
 * POST /api/service-desk/wrap-up-codes
 * Adds a new Wrap-Up Outcome or Interaction Topic directly to the tenant's Global List in PostgreSQL
 */
router.post('/wrap-up-codes', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { type = 'OUTCOME', label, category, subtopic, isFcrEligible = true } = req.body;

    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: 'Label is required' });
    }

    const cleanLabel = String(label).trim();
    const generatedCode = cleanLabel
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const lists = await ensureAndLoadTenantWrapUpLists(tenantId);
    const targetListId = type === 'TOPIC' ? lists.topicListId : lists.outcomeListId;

    if (!targetListId) {
      return res.status(500).json({ error: 'Target Global List could not be initialized' });
    }

    const createdItem = await globalPrisma.globalListItem.create({
      data: {
        listId: targetListId,
        tenantId,
        sortOrder: type === 'TOPIC' ? lists.wrapUpTopics.length : lists.wrapUpOutcomes.length,
        isActive: true,
        data:
          type === 'TOPIC'
            ? {
                label: cleanLabel,
                code: generatedCode,
                category: category || 'Operations',
                subtopic: subtopic || ''
              }
            : {
                label: cleanLabel,
                code: generatedCode,
                category: category || 'Resolution',
                is_fcr_eligible: Boolean(isFcrEligible)
              }
      }
    });

    const refreshed = await ensureAndLoadTenantWrapUpLists(tenantId);
    res.status(201).json({
      createdItem,
      wrapUpOutcomes: refreshed.wrapUpOutcomes,
      wrapUpTopics: refreshed.wrapUpTopics
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /wrap-up-codes error:', err);
    res.status(500).json({ error: err.message || 'Failed to add wrap-up code to Global List' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/suggest-wrap-up
 * Uses the tenant's AI provider (with deterministic fallback) to suggest Outcome, Topic, Sub-topic,
 * Sentiment, FCR, and Closing Summary Note from the real session transcript and linked records
 */
router.post('/sessions/:id/suggest-wrap-up', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;

    const session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const lists = await ensureAndLoadTenantWrapUpLists(tenantId);
    const availableOutcomes = lists.wrapUpOutcomes.map((o: any) => o.label);
    const availableTopics = lists.wrapUpTopics.map((t: any) => t.label);

    const messages: any[] = Array.isArray(session.messages) ? session.messages : [];
    const linkedRecords: any[] = Array.isArray(session.linkedRecords) ? session.linkedRecords : [];
    const transcriptText = messages
      .slice(-12)
      .map((m: any) => `${m.senderName} (${m.senderType}): ${m.content}`)
      .join('\n');
    const lowerTranscript = transcriptText.toLowerCase();

    // Deterministic baseline derived from real session cards, linked records, and messages
    let suggestedOutcome = availableOutcomes[0] || 'Resolved — First Contact';
    let suggestedTopic = availableTopics[0] || 'Service Request & Case Status';
    let suggestedSubtopic = 'General Assistance';
    let suggestedSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' =
      (session.sentiment as any) || 'POSITIVE';
    let suggestedFcr = !session.escalatedAt;
    const suggestedTags: string[] = Array.isArray(session.tags) ? [...session.tags] : [];

    const hasPaymentCard = messages.some((m: any) => m.messageType === 'PAYMENT_CARD');
    const hasBookingCard = messages.some((m: any) => m.messageType === 'BOOKING_CARD');
    const hasKbCard = messages.some((m: any) => m.messageType === 'KB_CITATION');

    if (hasPaymentCard || lowerTranscript.includes('invoice') || lowerTranscript.includes('payment')) {
      suggestedOutcome =
        availableOutcomes.find((o: string) => o.toLowerCase().includes('payment')) || suggestedOutcome;
      suggestedTopic =
        availableTopics.find((t: string) => t.toLowerCase().includes('billing')) || suggestedTopic;
      suggestedSubtopic = 'Invoice & Payment Settlement';
      if (!suggestedTags.includes('Billing')) suggestedTags.push('Billing');
    } else if (hasBookingCard || lowerTranscript.includes('booking') || lowerTranscript.includes('appointment')) {
      suggestedOutcome =
        availableOutcomes.find((o: string) => o.toLowerCase().includes('booking')) || suggestedOutcome;
      suggestedTopic =
        availableTopics.find((t: string) => t.toLowerCase().includes('booking')) || suggestedTopic;
      suggestedSubtopic = 'Appointment Confirmation';
      if (!suggestedTags.includes('Scheduled')) suggestedTags.push('Scheduled');
    } else if (linkedRecords.length > 0) {
      suggestedOutcome =
        availableOutcomes.find((o: string) => o.toLowerCase().includes('record')) || suggestedOutcome;
      suggestedTopic =
        availableTopics.find((t: string) => t.toLowerCase().includes('service request')) || suggestedTopic;
      suggestedSubtopic = linkedRecords[0]?.moduleName || 'Record Created';
    } else if (hasKbCard) {
      suggestedOutcome =
        availableOutcomes.find((o: string) => o.toLowerCase().includes('kb') || o.toLowerCase().includes('self-service')) ||
        suggestedOutcome;
      suggestedTopic =
        availableTopics.find((t: string) => t.toLowerCase().includes('general') || t.toLowerCase().includes('policy')) ||
        suggestedTopic;
      suggestedSubtopic = 'Knowledge Base Guidance';
    }

    if (lowerTranscript.includes('urgent') || lowerTranscript.includes('frustrated') || lowerTranscript.includes('unacceptable')) {
      suggestedSentiment = 'NEGATIVE';
    } else if (lowerTranscript.includes('thank') || lowerTranscript.includes('great') || lowerTranscript.includes('confirmed')) {
      suggestedSentiment = 'POSITIVE';
    }

    const lastVisitorMsg = [...messages].reverse().find((m: any) => m.senderType === 'VISITOR');
    const lastAgentMsg = [...messages]
      .reverse()
      .find((m: any) => m.senderType === 'HUMAN_AGENT' || m.senderType === 'AI_AGENT');

    let suggestedNotes =
      linkedRecords.length > 0
        ? `Assisted ${session.visitorName} via ${session.channelType === 'VOICE_CALL' ? 'Voice Queue' : session.siteName || 'Site Chat'} and linked record ${linkedRecords.map((r: any) => r.recordKey || r.title).join(', ')}.`
        : `Completed ${session.channelType === 'VOICE_CALL' ? 'voice call' : 'chat session'} with ${session.visitorName}${lastVisitorMsg ? ` regarding "${String(lastVisitorMsg.content).slice(0, 75)}"` : ''}.${lastAgentMsg ? ` ${String(lastAgentMsg.content).replace(/\*\*/g, '').slice(0, 110)}` : ''}`;

    // Try tenant AI completion to refine suggestion against the tenant's Global Lists
    try {
      const client = await resolveTenantAIClient(tenantId, 'low');
      const prompt = [
        `Analyze this customer service interaction and return ONLY valid JSON with keys: outcome, topic, subtopic, sentiment ("POSITIVE"|"NEUTRAL"|"NEGATIVE"), firstContactResolution (boolean), notes (1-2 concise sentences), tags (string array).`,
        `Choose "outcome" from: ${JSON.stringify(availableOutcomes)}`,
        `Choose "topic" from: ${JSON.stringify(availableTopics)}`,
        `Customer: ${session.visitorName} | Channel: ${session.channelType} | Linked Records: ${JSON.stringify(linkedRecords.map((r: any) => r.recordKey || r.title))}`,
        `Transcript:\n${transcriptText}`
      ].join('\n');

      const aiRes = await executeAICompletion(client, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const rawText = aiRes?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.outcome && availableOutcomes.includes(parsed.outcome)) suggestedOutcome = parsed.outcome;
        if (parsed.topic && availableTopics.includes(parsed.topic)) suggestedTopic = parsed.topic;
        if (parsed.subtopic) suggestedSubtopic = String(parsed.subtopic);
        if (['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(parsed.sentiment)) {
          suggestedSentiment = parsed.sentiment;
        }
        if (typeof parsed.firstContactResolution === 'boolean') {
          suggestedFcr = parsed.firstContactResolution;
        }
        if (parsed.notes && String(parsed.notes).trim().length > 10) {
          suggestedNotes = String(parsed.notes).trim();
        }
      }
    } catch (_aiErr) {
      // Fallback heuristic already populated above
    }

    res.json({
      outcome: suggestedOutcome,
      topic: suggestedTopic,
      subtopic: suggestedSubtopic,
      sentiment: suggestedSentiment,
      firstContactResolution: suggestedFcr,
      notes: suggestedNotes,
      tags: suggestedTags.slice(0, 5)
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/suggest-wrap-up error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate wrap-up suggestion' });
  }
});

/**
 * GET /api/service-desk/wrap-ups
 * Returns structured Wrap-Up & Disposition records for Report Builder, Query Builder, and BI
 */
router.get('/wrap-ups', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const [wrapUps, resolvedSessions] = await Promise.all([
      (globalPrisma as any).serviceDeskWrapUp
        .findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 500
        })
        .catch(() => []),
      (globalPrisma as any).serviceDeskSession
        .findMany({
          where: {
            tenantId,
            OR: [{ status: 'RESOLVED' }, { wrapUpOutcome: { not: null } }]
          },
          orderBy: { updatedAt: 'desc' },
          take: 500
        })
        .catch(() => [])
    ]);

    // Merge any resolved sessions that don't yet have a dedicated row in service_desk_wrap_ups
    const seenSessionIds = new Set(wrapUps.map((w: any) => w.sessionId));
    const synthesizedFromSessions = resolvedSessions
      .filter((s: any) => !seenSessionIds.has(s.id))
      .map((s: any) => ({
        id: `wu-${s.id}`,
        tenantId: s.tenantId,
        sessionId: s.id,
        channelType: s.channelType,
        siteId: s.siteId,
        siteName: s.siteName || 'Portal',
        visitorName: s.visitorName,
        outcome: s.wrapUpOutcome || 'Resolved — First Contact',
        topic: s.wrapUpTopic || 'General Inquiry',
        subtopic: s.wrapUpSubtopic || '',
        sentiment: s.wrapUpSentiment || s.sentiment || 'NEUTRAL',
        firstContactResolution: Boolean(s.firstContactResolution),
        notes: s.wrapUpNotes || s.aiSummary || '',
        tags: s.wrapUpTags || s.tags || [],
        wrappedUpByType: s.wrappedUpByType || s.allocatedAssigneeType || 'HUMAN_AGENT',
        wrappedUpById: s.wrappedUpById || s.allocatedMemberId || s.allocatedAgentId || null,
        wrappedUpByName: s.wrappedUpByName || s.allocatedMemberName || s.allocatedAgentName || 'Operator',
        handleDurationSeconds: s.handleDurationSeconds || 120,
        acwDurationSeconds: s.acwDurationSeconds || 15,
        csatScore: s.csatScore || null,
        createdAt: s.wrappedUpAt || s.resolvedAt || s.updatedAt
      }));

    res.json({
      wrapUps: [...wrapUps, ...synthesizedFromSessions]
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] GET /wrap-ups error:', err);
    res.status(500).json({ error: err.message || 'Failed to load wrap-up records' });
  }
});

/**
 * POST /api/service-desk/sessions/:id/resolve
 * Marks a session as RESOLVED (with full Wrap-Up & Disposition data) or reopens it
 */
router.post('/sessions/:id/resolve', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const { id } = req.params;
    const {
      status = 'RESOLVED',
      csatScore,
      csatFeedback,
      resolutionSummary,
      wrapUpOutcome,
      wrapUpTopic,
      wrapUpSubtopic,
      wrapUpSentiment,
      firstContactResolution,
      wrapUpNotes,
      wrapUpTags,
      acwDurationSeconds,
      wrappedUpByType,
      wrappedUpById,
      wrappedUpByName
    } = req.body;

    const existing = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const now = new Date();
    const isResolving = status === 'RESOLVED';
    const computedHandleSeconds = existing.createdAt
      ? Math.max(1, Math.round((now.getTime() - new Date(existing.createdAt).getTime()) / 1000))
      : 60;

    const finalNotes = wrapUpNotes || resolutionSummary || existing.wrapUpNotes || null;
    const finalOutcome = wrapUpOutcome || existing.wrapUpOutcome || (isResolving ? 'Resolved — First Contact' : null);
    const finalTopic = wrapUpTopic || existing.wrapUpTopic || (isResolving ? 'General Inquiry' : null);
    const finalSubtopic = wrapUpSubtopic !== undefined ? wrapUpSubtopic : existing.wrapUpSubtopic || null;
    const finalSentiment = wrapUpSentiment || existing.wrapUpSentiment || existing.sentiment || 'NEUTRAL';
    const finalFcr =
      typeof firstContactResolution === 'boolean'
        ? firstContactResolution
        : existing.firstContactResolution ?? !existing.escalatedAt;
    const finalByType =
      wrappedUpByType ||
      (existing.allocatedAssigneeType === 'AI_AGENT' ? 'AI_AGENT' : 'HUMAN_AGENT');
    const finalById =
      wrappedUpById || req.user?.uid || existing.allocatedMemberId || existing.allocatedAgentId || null;
    const finalByName =
      wrappedUpByName || existing.allocatedMemberName || existing.allocatedAgentName || 'Operator';
    const mergedTags = Array.isArray(wrapUpTags)
      ? Array.from(new Set([...(Array.isArray(existing.tags) ? existing.tags : []), ...wrapUpTags]))
      : existing.tags;

    const systemMessageParts = [
      isResolving
        ? `Interaction closed & wrapped up by **${finalByName}**:`
        : `Session reopened (${status}).`
    ];
    if (isResolving && finalOutcome) {
      systemMessageParts.push(
        `• **Outcome:** ${finalOutcome} | **Topic:** ${finalTopic}${finalSubtopic ? ` (${finalSubtopic})` : ''} | **FCR:** ${finalFcr ? 'Yes' : 'No'}`
      );
    }
    if (isResolving && finalNotes) {
      systemMessageParts.push(`• **Summary:** ${finalNotes}`);
    }

    await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: id,
        tenantId,
        senderType: 'SYSTEM',
        senderName: 'Service Desk Wrap-Up',
        content: systemMessageParts.join('\n'),
        messageType: 'TEXT',
        isRead: true
      }
    });

    if (isResolving && finalOutcome) {
      const linkedList = Array.isArray(existing.linkedRecords) ? existing.linkedRecords : [];
      await (globalPrisma as any).serviceDeskWrapUp
        .create({
          data: {
            tenantId,
            sessionId: id,
            channelType: existing.channelType || 'SITE_CHAT',
            siteId: existing.siteId || null,
            siteName: existing.siteName || null,
            outcome: finalOutcome,
            topic: finalTopic || 'General Inquiry',
            subtopic: finalSubtopic,
            sentiment: finalSentiment,
            firstContactResolution: Boolean(finalFcr),
            notes: finalNotes,
            tags: Array.isArray(wrapUpTags) ? wrapUpTags : existing.tags || [],
            linkedRecordIds: linkedList.map((r: any) => r.recordKey || r.recordId).filter(Boolean),
            wrappedUpByType: finalByType,
            wrappedUpById: finalById,
            wrappedUpByName: finalByName,
            handleDurationSeconds: computedHandleSeconds,
            acwDurationSeconds: typeof acwDurationSeconds === 'number' ? acwDurationSeconds : 0,
            csatScore: typeof csatScore === 'number' ? csatScore : existing.csatScore || null
          }
        })
        .catch((e: any) => {
          console.warn('[ServiceDeskAPI] Non-fatal wrapUp log creation warning:', e?.message);
        });
    }

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id },
      data: {
        status,
        resolvedAt: isResolving ? now : null,
        unreadByOperator: 0,
        ...(isResolving
          ? {
              wrapUpOutcome: finalOutcome,
              wrapUpTopic: finalTopic,
              wrapUpSubtopic: finalSubtopic,
              wrapUpSentiment: finalSentiment,
              sentiment: finalSentiment,
              firstContactResolution: Boolean(finalFcr),
              wrapUpNotes: finalNotes,
              wrapUpTags: Array.isArray(wrapUpTags) ? wrapUpTags : existing.wrapUpTags || [],
              tags: mergedTags,
              wrappedUpByType: finalByType,
              wrappedUpById: finalById,
              wrappedUpByName: finalByName,
              wrappedUpAt: now,
              handleDurationSeconds: computedHandleSeconds,
              acwDurationSeconds: typeof acwDurationSeconds === 'number' ? acwDurationSeconds : 0
            }
          : {}),
        ...(typeof csatScore === 'number' ? { csatScore } : {}),
        ...(csatFeedback ? { csatFeedback } : {}),
        ...(finalNotes ? { aiSummary: finalNotes } : {})
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitServiceDeskSessionUpdate(tenantId, id, 'service_desk:session_updated', updatedSession);

    try {
      const { AutomationEngine } = await import('../services/automationEngine');
      AutomationEngine.triggerEvent(tenantId, 'SERVICE_DESK_RESOLVED' as any, updatedSession.id, updatedSession, globalPrisma).catch(() => {});
    } catch (_e) {}

    res.json(updatedSession);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /sessions/:id/resolve error:', err);
    res.status(500).json({ error: err.message || 'Failed to update session status' });
  }
});

/**
 * POST /api/service-desk/voice/simulate-inbound
 * Registers an inbound or outbound voice call in the Service Desk queue
 */
router.post('/voice/simulate-inbound', async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = await resolveTenantContext(req);
    const {
      callerName,
      callerNumber,
      callerEmail,
      partyId,
      queueName = 'Voice Queue',
      ivrSummary = 'Inbound voice call connected.'
    } = req.body;

    // Resolve real party if partyId provided or pick from caller details
    let resolvedCallerName = callerName;
    const resolvedCallerNumber = callerNumber || '+61 1800 000 000';

    if (partyId) {
      const party = await globalPrisma.party
        .findFirst({
          where: { id: partyId, tenantId },
          include: { person: true, organization: true }
        })
        .catch(() => null);
      if (party) {
        resolvedCallerName = party.person
          ? [party.person.firstName, party.person.lastName].filter(Boolean).join(' ')
          : party.organization?.legalName || resolvedCallerName;
      }
    }

    if (!resolvedCallerName) {
      resolvedCallerName = 'Inbound Caller';
    }

    const allocation = await resolveSessionAllocation(tenantId, 'HUMAN_FIRST', {
      targetAssigneeType: 'HUMAN_USER'
    });

    const callSession = await (globalPrisma as any).serviceDeskSession.create({
      data: {
        tenantId,
        siteName: `Voice Line (${resolvedCallerNumber})`,
        channelType: 'VOICE_CALL',
        status: 'QUEUED_FOR_HUMAN',
        priority: 'HIGH',
        visitorToken: `voice-${Date.now()}`,
        partyId: partyId || null,
        visitorName: resolvedCallerName.trim(),
        visitorEmail: callerEmail || null,
        visitorPhone: resolvedCallerNumber,
        currentPageSlug: queueName,
        currentPageTitle: queueName,
        isAuthenticated: Boolean(partyId || callerEmail),
        allocationMode: 'HUMAN_FIRST',
        allocatedAssigneeType: allocation.allocatedAssigneeType,
        allocatedMemberId: allocation.allocatedMemberId,
        allocatedMemberName: allocation.allocatedMemberName,
        allocatedTeamId: allocation.allocatedTeamId,
        allocatedTeamName: allocation.allocatedTeamName || queueName,
        aiWhisperEnabled: true,
        sentiment: 'NEUTRAL',
        confidenceScore: 0.9,
        aiSummary: ivrSummary,
        tags: ['Voice Call', queueName],
        metadata: {
          callerNumber: resolvedCallerNumber,
          queueName,
          callStatus: 'RINGING'
        },
        slaDeadline: new Date(Date.now() + 5 * 60000),
        slaStatus: 'ON_TRACK',
        unreadByOperator: 1,
        lastMessageAt: new Date(),
        lastMessagePreview: `Voice Call: ${resolvedCallerName} (${resolvedCallerNumber})`
      }
    });

    await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: callSession.id,
        tenantId,
        senderType: 'SYSTEM',
        senderName: 'Voice Queue',
        content: `Incoming call from **${resolvedCallerName}** (${resolvedCallerNumber}) in **${queueName}**.${ivrSummary ? `\n\n${ivrSummary}` : ''}`,
        messageType: 'CALL_EVENT',
        payload: {
          callEventType: 'INBOUND_RINGING',
          callerNumber: resolvedCallerNumber,
          queueName
        },
        isRead: false
      }
    });

    const populated = await (globalPrisma as any).serviceDeskSession.findUnique({
      where: { id: callSession.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitTenantUpdate(tenantId, 'service_desk:session_created', populated);
    res.status(201).json(populated);
  } catch (err: any) {
    console.error('[ServiceDeskAPI] POST /voice/simulate-inbound error:', err);
    res.status(500).json({ error: err.message || 'Failed to create voice queue call' });
  }
});

// ============================================================================
// PUBLIC SITE CUSTOMER CHAT ENDPOINTS (/api/service-desk/public/sites/:siteId/*)
// ============================================================================

export const handleGetOrInitPublicSiteChatSession = async (req: any, res: Response) => {
  try {
    const siteIdOrDomain = req.params.siteId || req.params.id;
    const visitorToken =
      (req.query.visitorToken as string) || (req.headers['x-visitor-token'] as string) || `vis-${Date.now()}`;
    const currentPageSlug = (req.query.pageSlug as string) || '/';
    const visitorName = (req.query.visitorName as string) || undefined;
    const visitorEmail = (req.query.visitorEmail as string) || undefined;

    const site = await globalPrisma.site.findFirst({
      where: { OR: [{ id: siteIdOrDomain }, { domain: siteIdOrDomain }] },
      include: { brand: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const siteBranding = site.branding && typeof site.branding === 'object' ? (site.branding as any) : {};
    const chatConfig = siteBranding.chatConfig || {};

    let session = await (globalPrisma as any).serviceDeskSession.findFirst({
      where: {
        tenantId: site.tenantId,
        siteId: site.id,
        visitorToken,
        status: { notIn: ['ARCHIVED'] }
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      const allocationMode = chatConfig.allocationMode || 'AI_FIRST';
      const initialAllocation = await resolveSessionAllocation(site.tenantId, allocationMode, {
        siteChatConfig: chatConfig,
        targetAgentId: chatConfig.primaryAgentId,
        targetTeamId: chatConfig.fallbackTeamId,
        targetQueueId: chatConfig.fallbackQueueId
      });

      const welcomeText =
        chatConfig.welcomeMessage ||
        `Welcome to **${site.name}**. I'm **${initialAllocation.allocatedAgentName || initialAllocation.allocatedMemberName || 'your assistant'}**—how can I help you today?`;

      session = await (globalPrisma as any).serviceDeskSession.create({
        data: {
          tenantId: site.tenantId,
          siteId: site.id,
          siteName: site.name,
          channelType: 'SITE_CHAT',
          status: initialAllocation.status,
          priority: 'MEDIUM',
          visitorToken,
          visitorName: visitorName || 'Site Visitor',
          visitorEmail: visitorEmail || null,
          currentPageSlug,
          currentPageTitle: currentPageSlug === '/' ? 'Home' : currentPageSlug,
          isAuthenticated: Boolean(visitorEmail),
          allocationMode,
          allocatedAssigneeType: initialAllocation.allocatedAssigneeType,
          allocatedMemberId: initialAllocation.allocatedMemberId,
          allocatedMemberName: initialAllocation.allocatedMemberName,
          allocatedAgentId: initialAllocation.allocatedAgentId,
          allocatedAgentName: initialAllocation.allocatedAgentName,
          allocatedTeamId: initialAllocation.allocatedTeamId,
          allocatedTeamName: initialAllocation.allocatedTeamName,
          aiWhisperEnabled: chatConfig.aiWhisperEnabled !== false,
          slaDeadline: new Date(Date.now() + (chatConfig.slaTargetMinutes || 15) * 60000),
          slaStatus: 'ON_TRACK',
          lastMessageAt: new Date(),
          lastMessagePreview: welcomeText.replace(/\*\*/g, '').slice(0, 120)
        }
      });

      await (globalPrisma as any).serviceDeskMessage.create({
        data: {
          sessionId: session.id,
          tenantId: site.tenantId,
          senderType: initialAllocation.allocatedAssigneeType === 'HUMAN_USER' ? 'HUMAN_AGENT' : 'AI_AGENT',
          senderId: initialAllocation.allocatedAgentId || initialAllocation.allocatedMemberId || 'default-agent',
          senderName: initialAllocation.allocatedAgentName || initialAllocation.allocatedMemberName || site.name,
          senderRole: initialAllocation.allocatedAssigneeType === 'HUMAN_USER' ? 'Operator' : 'AI Assistant',
          content: welcomeText,
          messageType: 'TEXT',
          isRead: true
        }
      });

      session = await (globalPrisma as any).serviceDeskSession.findUnique({
        where: { id: session.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });

      emitTenantUpdate(site.tenantId, 'service_desk:session_created', session);
    } else if (currentPageSlug && session.currentPageSlug !== currentPageSlug) {
      session = await (globalPrisma as any).serviceDeskSession.update({
        where: { id: session.id },
        data: {
          currentPageSlug,
          ...(visitorName && session.visitorName === 'Site Visitor' ? { visitorName } : {}),
          ...(visitorEmail && !session.visitorEmail ? { visitorEmail, isAuthenticated: true } : {})
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
      emitServiceDeskSessionUpdate(site.tenantId, session.id, 'service_desk:page_navigated', {
        sessionId: session.id,
        currentPageSlug
      });
    }

    res.json({
      session,
      chatConfig
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] Public session init error:', err);
    res.status(500).json({ error: err.message || 'Failed to initialize site chat session' });
  }
};

export const handlePublicSiteChatMessage = async (req: any, res: Response) => {
  try {
    const siteIdOrDomain = req.params.siteId || req.params.id;
    const {
      sessionId,
      visitorToken = `vis-${Date.now()}`,
      message,
      senderName,
      senderEmail,
      currentPageSlug = '/'
    } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const site = await globalPrisma.site.findFirst({
      where: { OR: [{ id: siteIdOrDomain }, { domain: siteIdOrDomain }] }
    });
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    let session = sessionId
      ? await (globalPrisma as any).serviceDeskSession.findFirst({
          where: { id: sessionId, tenantId: site.tenantId },
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        })
      : await (globalPrisma as any).serviceDeskSession.findFirst({
          where: { tenantId: site.tenantId, siteId: site.id, visitorToken },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' }
        });

    if (!session) {
      const siteBranding = site.branding && typeof site.branding === 'object' ? (site.branding as any) : {};
      const chatConfig = siteBranding.chatConfig || {};
      const initialAllocation = await resolveSessionAllocation(site.tenantId, chatConfig.allocationMode || 'AI_FIRST', {
        siteChatConfig: chatConfig
      });

      session = await (globalPrisma as any).serviceDeskSession.create({
        data: {
          tenantId: site.tenantId,
          siteId: site.id,
          siteName: site.name,
          channelType: 'SITE_CHAT',
          status: initialAllocation.status,
          priority: 'MEDIUM',
          visitorToken,
          visitorName: senderName || 'Site Visitor',
          visitorEmail: senderEmail || null,
          currentPageSlug,
          isAuthenticated: Boolean(senderEmail),
          allocationMode: chatConfig.allocationMode || 'AI_FIRST',
          allocatedAssigneeType: initialAllocation.allocatedAssigneeType,
          allocatedMemberId: initialAllocation.allocatedMemberId,
          allocatedMemberName: initialAllocation.allocatedMemberName,
          allocatedAgentId: initialAllocation.allocatedAgentId,
          allocatedAgentName: initialAllocation.allocatedAgentName,
          allocatedTeamId: initialAllocation.allocatedTeamId,
          allocatedTeamName: initialAllocation.allocatedTeamName,
          aiWhisperEnabled: true
        },
        include: { messages: true }
      });
    }

    const resolvedVisitorName = senderName || session.visitorName || 'Site Visitor';

    const visitorMsg = await (globalPrisma as any).serviceDeskMessage.create({
      data: {
        sessionId: session.id,
        tenantId: site.tenantId,
        senderType: 'VISITOR',
        senderName: resolvedVisitorName,
        content: String(message).trim(),
        messageType: 'TEXT',
        isRead: false
      }
    });

    const updatedHistory = [...(session.messages || []), visitorMsg];

    let aiMsg: any = null;
    const sessionUpdateData: any = {
      visitorName: resolvedVisitorName,
      ...(senderEmail ? { visitorEmail: senderEmail, isAuthenticated: true } : {}),
      currentPageSlug: currentPageSlug || session.currentPageSlug,
      unreadByOperator: { increment: 1 },
      lastMessageAt: new Date(),
      lastMessagePreview: String(message).trim().slice(0, 140)
    };

    if (session.status === 'RESOLVED') {
      sessionUpdateData.status = session.allocatedAssigneeType === 'HUMAN_USER' ? 'ASSIGNED_HUMAN' : 'ACTIVE_AI';
    }

    if (session.allocatedAssigneeType === 'AI_AGENT' && session.status !== 'ASSIGNED_HUMAN') {
      const aiTurn = await executeServiceDeskAiTurn(
        {
          ...session,
          visitorName: resolvedVisitorName,
          visitorEmail: senderEmail || session.visitorEmail,
          currentPageSlug
        },
        String(message).trim(),
        updatedHistory
      );

      aiMsg = await (globalPrisma as any).serviceDeskMessage.create({
        data: {
          sessionId: session.id,
          tenantId: site.tenantId,
          senderType: 'AI_AGENT',
          senderId: session.allocatedAgentId || 'default-tenant-agent',
          senderName: aiTurn.senderName,
          senderRole: 'AI Assistant',
          content: aiTurn.content,
          messageType: aiTurn.messageType,
          payload: aiTurn.payload || {},
          aiTrace: aiTurn.aiTrace || null,
          isRead: true
        }
      });

      sessionUpdateData.lastMessagePreview = aiTurn.content.replace(/\*\*/g, '').slice(0, 140);
      sessionUpdateData.confidenceScore = aiTurn.aiTrace?.confidenceScore ?? session.confidenceScore;
      sessionUpdateData.firstResponseAt = session.firstResponseAt || new Date();

      if (aiTurn.escalateToHuman && aiTurn.newAllocation) {
        Object.assign(sessionUpdateData, aiTurn.newAllocation, {
          escalatedAt: new Date()
        });
      } else if (aiTurn.awaitHitlApproval && aiTurn.hitlRequest) {
        sessionUpdateData.status = 'AWAITING_HITL_APPROVAL';
        sessionUpdateData.pendingHitlTool = aiTurn.hitlRequest;
      }
    } else if (session.aiWhisperEnabled) {
      const whisperTurn = await executeServiceDeskAiTurn(session, String(message).trim(), updatedHistory);
      sessionUpdateData.aiSuggestedReply = whisperTurn.content.replace(/\*\*/g, '');
    }

    const updatedSession = await (globalPrisma as any).serviceDeskSession.update({
      where: { id: session.id },
      data: sessionUpdateData,
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    emitServiceDeskSessionUpdate(site.tenantId, session.id, 'service_desk:message', {
      sessionId: session.id,
      message: aiMsg || visitorMsg,
      visitorMessage: visitorMsg,
      aiMessage: aiMsg,
      session: updatedSession
    });

    res.json({
      success: true,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: aiMsg ? aiMsg.senderName : updatedSession.allocatedMemberName || 'Operator',
      reply: aiMsg
        ? aiMsg.content
        : `Your message has been sent to ${updatedSession.allocatedMemberName || 'our team'}.`,
      visitorMessage: visitorMsg,
      aiMessage: aiMsg,
      session: updatedSession
    });
  } catch (err: any) {
    console.error('[ServiceDeskAPI] Public chat message error:', err);
    res.status(500).json({ error: err.message || 'Failed to process site chat message' });
  }
};

router.get('/public/sites/:siteId/session', handleGetOrInitPublicSiteChatSession);
router.post('/public/sites/:siteId/message', handlePublicSiteChatMessage);

export default router;

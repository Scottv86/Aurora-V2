import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { generateEmbedding } from '../lib/ai';
import { recordAudit } from '../lib/audit';
import { globalPrisma } from '../lib/prisma';
import { DedupeService } from '../services/dedupeService';

const router = express.Router();

const ENTITY_STATUS_VALUES = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'INACTIVE',
  'VERIFIED',
  'UNVERIFIED',
  'FLAGGED',
  'ARCHIVED',
] as const;

const AddressItemSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional().default('PRIMARY'), // PRIMARY, BILLING, SHIPPING, PHYSICAL, MAILING
  label: z.string().optional(),
  line1: z.string().optional().default(''),
  line2: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  country: z.string().optional().default('Australia'),
  isPrimary: z.boolean().optional().default(false),
});

// Validation Schemas
const PeopleOrgCreateSchema = z.object({
  partyType: z.enum(['PERSON', 'ORGANIZATION']),
  status: z.enum(ENTITY_STATUS_VALUES).optional(),
  partyCode: z.string().optional().nullable(),
  displayName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  secondaryEmail: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  classifications: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  addresses: z.any().optional(),
  socialLinks: z.any().optional(),
  preferredContactMethod: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  accountOwnerMemberId: z.string().optional().nullable(),
  notesSummary: z.string().optional().nullable(),
  customData: z.record(z.string(), z.any()).optional().nullable(),
  isStarred: z.boolean().optional(),
  createdBySwarmId: z.string().optional().nullable(),
  creationContextLog: z.string().optional().nullable(),
  skipDeduplication: z.boolean().optional(),

  // Person fields
  person: z
    .object({
      salutation: z.string().optional().nullable(),
      firstName: z.string(),
      middleName: z.string().optional().nullable(),
      lastName: z.string(),
      preferredName: z.string().optional().nullable(),
      jobTitle: z.string().optional().nullable(),
      department: z.string().optional().nullable(),
      primaryOrgPartyId: z.string().optional().nullable(),
      primaryOrgName: z.string().optional().nullable(),
      dateOfBirth: z.string().optional().nullable(),
      isHumanInLoop: z.boolean().optional(),
    })
    .optional(),

  // Organization fields
  organization: z
    .object({
      legalName: z.string(),
      tradingName: z.string().optional().nullable(),
      orgStructureType: z.string().optional().default('Corporate'),
      incorporationDate: z.string().optional().nullable(),
      taxIdentifier: z.string().optional().nullable(),
      companyRegistrationNumber: z.string().optional().nullable(),
      industry: z.string().optional().nullable(),
      subIndustry: z.string().optional().nullable(),
      companySize: z.string().optional().nullable(),
      annualRevenue: z.string().optional().nullable(),
      billingEmail: z.string().optional().nullable(),
      paymentTerms: z.string().optional().nullable(),
      creditLimit: z.union([z.number(), z.string()]).optional().nullable(),
      primaryContactPartyId: z.string().optional().nullable(),
    })
    .optional(),
});

/**
 * Helper to format a TenantMember record consistently
 */
export function formatTenantMember(m: any) {
  if (!m) return null;
  const fullName =
    `${m.firstName || ''} ${m.familyName || ''}`.trim() ||
    m.workEmail ||
    m.user?.email ||
    m.personalEmail ||
    'Member';
  return {
    id: m.id,
    name: fullName,
    email: m.workEmail || m.user?.email || m.personalEmail || '',
    avatarUrl: m.avatarUrl || null,
    role: m.roleId || 'Member',
    jobTitle: m.position?.title || null,
    department: m.team?.name || null,
  };
}

/**
 * Helper to compute displayName & backward-compatible nested contactDetails
 */
export function enrichPartyRecord(party: any, membersMap?: Map<string, any>) {
  if (!party) return party;
  const computedName =
    party.displayName ||
    (party.partyType === 'PERSON'
      ? `${party.person?.firstName || ''} ${party.person?.lastName || ''}`.trim()
      : party.organization?.legalName || party.organization?.tradingName) ||
    'Unnamed Entity';

  const contactDetails = {
    email: party.email || party.organization?.billingEmail || null,
    secondaryEmail: party.secondaryEmail || null,
    phone: party.phone || party.mobile || null,
    mobile: party.mobile || null,
    website: party.website || null,
  };

  const accountOwner =
    party.accountOwnerMemberId && membersMap
      ? membersMap.get(party.accountOwnerMemberId) || null
      : party.accountOwner || null;

  return {
    ...party,
    displayName: computedName,
    accountOwner,
    person: party.person
      ? {
          ...party.person,
          avatarUrl: party.avatarUrl || party.person.avatarUrl || null,
          contactDetails,
        }
      : null,
    organization: party.organization
      ? {
          ...party.organization,
          logoUrl: party.avatarUrl || party.organization.logoUrl || null,
          contactDetails,
        }
      : null,
  };
}

/**
 * Helper to flatten fields from a Module layout JSON
 */
function extractModuleFields(layout: any[]): any[] {
  if (!Array.isArray(layout)) return [];
  const result: any[] = [];
  for (const item of layout) {
    if (!item || typeof item !== 'object') continue;
    if (item.id && item.type) {
      result.push(item);
    }
    if (Array.isArray(item.fields)) {
      result.push(...extractModuleFields(item.fields));
    }
    if (Array.isArray(item.children)) {
      result.push(...extractModuleFields(item.children));
    }
    if (Array.isArray(item.columns)) {
      for (const col of item.columns) {
        if (Array.isArray(col?.fields)) {
          result.push(...extractModuleFields(col.fields));
        }
      }
    }
  }
  return result;
}

// ============================================================================
// GET Global People & Organisation Directory (with Search, Filters & KPI Stats)
// ============================================================================
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const {
      search,
      status,
      partyType,
      classification,
      accountOwnerMemberId,
      isStarred,
      ids,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '100',
    } = req.query;

    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.min(500, Math.max(1, parseInt(limit as string) || 100));
    const skip = (p - 1) * l;

    const where: any = {
      tenantId,
    };

    if (ids && typeof ids === 'string') {
      const idList = ids
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (idList.length > 0) {
        where.id = { in: idList };
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (partyType && partyType !== 'ALL' && (partyType === 'PERSON' || partyType === 'ORGANIZATION')) {
      where.partyType = partyType;
    }

    if (classification && classification !== 'ALL' && typeof classification === 'string') {
      where.classifications = { has: classification };
    }

    if (accountOwnerMemberId && accountOwnerMemberId !== 'ALL' && typeof accountOwnerMemberId === 'string') {
      where.accountOwnerMemberId = accountOwnerMemberId;
    }

    if (isStarred === 'true') {
      where.isStarred = true;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { secondaryEmail: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
        { partyCode: { contains: q, mode: 'insensitive' } },
        { website: { contains: q, mode: 'insensitive' } },
        {
          person: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { preferredName: { contains: q, mode: 'insensitive' } },
              { jobTitle: { contains: q, mode: 'insensitive' } },
              { department: { contains: q, mode: 'insensitive' } },
              { primaryOrgName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        {
          organization: {
            OR: [
              { legalName: { contains: q, mode: 'insensitive' } },
              { tradingName: { contains: q, mode: 'insensitive' } },
              { taxIdentifier: { contains: q, mode: 'insensitive' } },
              { companyRegistrationNumber: { contains: q, mode: 'insensitive' } },
              { industry: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    let orderByClause: any = { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' };
    if (sortBy === 'updatedAt') {
      orderByClause = { updatedAt: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (sortBy === 'name' || sortBy === 'displayName') {
      orderByClause = { displayName: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (sortBy === 'status') {
      orderByClause = { status: sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    const [
      total,
      partiesRaw,
      allTenantCount,
      peopleCount,
      orgCount,
      verifiedCount,
      flaggedCount,
      pendingCount,
      tenantMembers,
    ] = await Promise.all([
      db.party.count({ where }),
      db.party.findMany({
        where,
        include: {
          person: true,
          organization: true,
          _count: {
            select: {
              sourceRelationships: true,
              targetRelationships: true,
              invoices: true,
              bills: true,
              posOrders: true,
              paymentTransactions: true,
              returnRequests: true,
            },
          },
        },
        orderBy: orderByClause,
        skip,
        take: l,
      }),
      db.party.count({ where: { tenantId } }),
      db.party.count({ where: { tenantId, partyType: 'PERSON' } }),
      db.party.count({ where: { tenantId, partyType: 'ORGANIZATION' } }),
      db.party.count({ where: { tenantId, status: { in: ['VERIFIED', 'ACTIVE'] } } }),
      db.party.count({ where: { tenantId, status: 'FLAGGED' } }),
      db.party.count({ where: { tenantId, status: { in: ['PENDING_REVIEW', 'UNVERIFIED', 'DRAFT'] } } }),
      globalPrisma.tenantMember.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          familyName: true,
          workEmail: true,
          personalEmail: true,
          avatarUrl: true,
          roleId: true,
          user: { select: { id: true, email: true } },
          position: { select: { title: true } },
          team: { select: { name: true } },
        },
      }),
    ]);

    const membersMap = new Map(tenantMembers.map((m) => [m.id, formatTenantMember(m)]));
    const parties = partiesRaw.map((p) => enrichPartyRecord(p, membersMap));

    res.json({
      parties,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      stats: {
        total: allTenantCount,
        peopleCount,
        orgCount,
        verifiedCount,
        flaggedCount,
        pendingCount,
      },
    });
  } catch (err: any) {
    console.error('[GET /people-organisations] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET & PUT Directory Configuration (Custom Fields, Classifications, Rules)
// Backed by Workspace Global Lists as the single source of truth
// ============================================================================

async function ensureAndLoadDirectoryGlobalLists(tenantId: string, customConfig?: any) {
  const targetNames = [
    'Directory Classifications',
    'Directory Industries',
    'Directory Legal Structures',
    'Directory Relationship Types',
  ];

  const existingLists = await globalPrisma.globalList.findMany({
    where: {
      tenantId,
      OR: [
        { name: { in: targetNames } },
        ...(customConfig?.classificationsListId ? [{ id: customConfig.classificationsListId }] : []),
        ...(customConfig?.industriesListId ? [{ id: customConfig.industriesListId }] : []),
        ...(customConfig?.legalStructuresListId ? [{ id: customConfig.legalStructuresListId }] : []),
        ...(customConfig?.relationshipTypesListId ? [{ id: customConfig.relationshipTypesListId }] : []),
      ],
    },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  }).catch((err) => {
    console.error('[DirectoryGlobalLists] findMany error:', err);
    return [];
  });

  let classificationsList = customConfig?.classificationsListId
    ? existingLists.find((l: any) => l.id === customConfig.classificationsListId)
    : existingLists.find((l: any) => l.name === 'Directory Classifications');

  let industriesList = customConfig?.industriesListId
    ? existingLists.find((l: any) => l.id === customConfig.industriesListId)
    : existingLists.find((l: any) => l.name === 'Directory Industries');

  let legalStructuresList = customConfig?.legalStructuresListId
    ? existingLists.find((l: any) => l.id === customConfig.legalStructuresListId)
    : existingLists.find((l: any) => l.name === 'Directory Legal Structures');

  let relationshipTypesList = customConfig?.relationshipTypesListId
    ? existingLists.find((l: any) => l.id === customConfig.relationshipTypesListId)
    : existingLists.find((l: any) => l.name === 'Directory Relationship Types');

  if (!classificationsList) {
    try {
      classificationsList = await globalPrisma.globalList.create({
        data: {
          tenantId,
          name: 'Directory Classifications',
          description: 'Entity classification tags and CRM segmentation badges (e.g. Client, Supplier, Partner, VIP).',
          isSystem: true,
          columns: [
            { id: 'label', name: 'Classification Name', type: 'text', required: true },
            { id: 'code', name: 'Code', type: 'text', required: true },
            { id: 'color', name: 'Badge Color', type: 'choice', options: ['emerald', 'amber', 'indigo', 'purple', 'rose', 'sky', 'zinc', 'cyan'] },
            { id: 'description', name: 'Description', type: 'text' },
          ],
          items: {
            create: [
              { sortOrder: 0, isActive: true, data: { label: 'Client', code: 'CLIENT', color: 'emerald', description: 'Active paying client' } },
              { sortOrder: 1, isActive: true, data: { label: 'Supplier', code: 'SUPPLIER', color: 'amber', description: 'Vendor supplying goods or services' } },
              { sortOrder: 2, isActive: true, data: { label: 'Partner', code: 'PARTNER', color: 'indigo', description: 'Strategic or channel partner' } },
              { sortOrder: 3, isActive: true, data: { label: 'Prospect', code: 'PROSPECT', color: 'sky', description: 'Sales lead or prospective client' } },
              { sortOrder: 4, isActive: true, data: { label: 'Investor', code: 'INVESTOR', color: 'purple', description: 'Shareholder or investment partner' } },
              { sortOrder: 5, isActive: true, data: { label: 'Competitor', code: 'COMPETITOR', color: 'rose', description: 'Market competitor' } },
              { sortOrder: 6, isActive: true, data: { label: 'Regulator', code: 'REGULATOR', color: 'zinc', description: 'Government or industry regulator' } },
              { sortOrder: 7, isActive: true, data: { label: 'Contractor', code: 'CONTRACTOR', color: 'amber', description: 'Independent contractor' } },
              { sortOrder: 8, isActive: true, data: { label: 'Subsidiary', code: 'SUBSIDIARY', color: 'indigo', description: 'Subsidiary or owned entity' } },
              { sortOrder: 9, isActive: true, data: { label: 'Advisor', code: 'ADVISOR', color: 'cyan', description: 'Legal, tax, or business advisor' } },
              { sortOrder: 10, isActive: true, data: { label: 'VIP', code: 'VIP', color: 'purple', description: 'High-priority entity' } },
            ],
          },
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    } catch (e) {
      console.error('[DirectoryGlobalLists] Error creating Classifications list:', e);
    }
  }

  if (!industriesList) {
    try {
      industriesList = await globalPrisma.globalList.create({
        data: {
          tenantId,
          name: 'Directory Industries',
          description: 'Standard industry classifications and economic sectors for directory organisations.',
          isSystem: true,
          columns: [
            { id: 'label', name: 'Industry Name', type: 'text', required: true },
            { id: 'code', name: 'Code', type: 'text', required: true },
            { id: 'sector', name: 'Sector', type: 'text' },
          ],
          items: {
            create: [
              { sortOrder: 0, isActive: true, data: { label: 'Technology & Software', code: 'TECH', sector: 'Information Technology' } },
              { sortOrder: 1, isActive: true, data: { label: 'Financial Services & Banking', code: 'FIN_SERVICES', sector: 'Finance & Insurance' } },
              { sortOrder: 2, isActive: true, data: { label: 'Healthcare & Life Sciences', code: 'HEALTHCARE', sector: 'Health & Medical' } },
              { sortOrder: 3, isActive: true, data: { label: 'Manufacturing & Engineering', code: 'MANUFACTURING', sector: 'Industry & Production' } },
              { sortOrder: 4, isActive: true, data: { label: 'Retail & Consumer Goods', code: 'RETAIL', sector: 'Commerce' } },
              { sortOrder: 5, isActive: true, data: { label: 'Professional Services & Consulting', code: 'PROF_SERVICES', sector: 'Consulting & Legal' } },
              { sortOrder: 6, isActive: true, data: { label: 'Construction & Real Estate', code: 'CONSTRUCTION', sector: 'Property & Infrastructure' } },
              { sortOrder: 7, isActive: true, data: { label: 'Energy, Oil & Gas', code: 'ENERGY', sector: 'Resources & Utilities' } },
              { sortOrder: 8, isActive: true, data: { label: 'Education & Training', code: 'EDUCATION', sector: 'Education' } },
              { sortOrder: 9, isActive: true, data: { label: 'Hospitality & Tourism', code: 'HOSPITALITY', sector: 'Services' } },
              { sortOrder: 10, isActive: true, data: { label: 'Transport & Logistics', code: 'LOGISTICS', sector: 'Supply Chain' } },
              { sortOrder: 11, isActive: true, data: { label: 'Agriculture & Forestry', code: 'AGRICULTURE', sector: 'Primary Industry' } },
              { sortOrder: 12, isActive: true, data: { label: 'Government & Public Sector', code: 'GOVERNMENT', sector: 'Public Administration' } },
              { sortOrder: 13, isActive: true, data: { label: 'Non-Profit & Community', code: 'NON_PROFIT', sector: 'Charity & NGO' } },
              { sortOrder: 14, isActive: true, data: { label: 'Automotive & Mobility', code: 'AUTOMOTIVE', sector: 'Transportation' } },
              { sortOrder: 15, isActive: true, data: { label: 'Telecommunications & Media', code: 'TELECOM', sector: 'Communications' } },
            ],
          },
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    } catch (e) {
      console.error('[DirectoryGlobalLists] Error creating Industries list:', e);
    }
  }

  if (!legalStructuresList) {
    try {
      legalStructuresList = await globalPrisma.globalList.create({
        data: {
          tenantId,
          name: 'Directory Legal Structures',
          description: 'Corporate and legal organization structures recognized in the directory.',
          isSystem: true,
          columns: [
            { id: 'label', name: 'Structure Name', type: 'text', required: true },
            { id: 'code', name: 'Code', type: 'text', required: true },
            { id: 'description', name: 'Description', type: 'text' },
          ],
          items: {
            create: [
              { sortOrder: 0, isActive: true, data: { label: 'Company', code: 'COMPANY', description: 'Corporation / General Company' } },
              { sortOrder: 1, isActive: true, data: { label: 'Private Limited (Pty Ltd)', code: 'PTY_LTD', description: 'Proprietary Limited Company' } },
              { sortOrder: 2, isActive: true, data: { label: 'Public Listed', code: 'PUBLIC_LISTED', description: 'Publicly Traded Company' } },
              { sortOrder: 3, isActive: true, data: { label: 'Trust', code: 'TRUST', description: 'Family, Unit, or Discretionary Trust' } },
              { sortOrder: 4, isActive: true, data: { label: 'Partnership', code: 'PARTNERSHIP', description: 'General or Limited Partnership' } },
              { sortOrder: 5, isActive: true, data: { label: 'Sole Trader', code: 'SOLE_TRADER', description: 'Sole Proprietor' } },
              { sortOrder: 6, isActive: true, data: { label: 'Non-Profit / Charity', code: 'NON_PROFIT', description: 'Incorporated Not-for-Profit or Charity' } },
              { sortOrder: 7, isActive: true, data: { label: 'Government Agency', code: 'GOVERNMENT', description: 'Government Body or Agency' } },
              { sortOrder: 8, isActive: true, data: { label: 'Incorporated Association', code: 'INCORPORATED_ASSOC', description: 'State/Regional Association' } },
              { sortOrder: 9, isActive: true, data: { label: 'Limited Liability Company (LLC)', code: 'LLC', description: 'Limited Liability Company' } },
              { sortOrder: 10, isActive: true, data: { label: 'Co-operative', code: 'COOPERATIVE', description: 'Member-owned Co-operative' } },
            ],
          },
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    } catch (e) {
      console.error('[DirectoryGlobalLists] Error creating Legal Structures list:', e);
    }
  }

  if (!relationshipTypesList) {
    try {
      relationshipTypesList = await globalPrisma.globalList.create({
        data: {
          tenantId,
          name: 'Directory Relationship Types',
          description: 'Core entity relationship rules, graph connection types, and directional constraints.',
          isSystem: true,
          columns: [
            { id: 'label', name: 'Relationship Name', type: 'text', required: true },
            { id: 'code', name: 'Code', type: 'text', required: true },
            { id: 'inverse_label', name: 'Inverse Label', type: 'text' },
            { id: 'source_type', name: 'Source Entity Type', type: 'choice', options: ['All', 'Person', 'Organisation'] },
            { id: 'target_type', name: 'Target Entity Type', type: 'choice', options: ['All', 'Person', 'Organisation'] },
            { id: 'category', name: 'Category', type: 'choice', options: ['Governance', 'Employment', 'Commercial', 'Personal', 'Other'] },
            { id: 'color', name: 'Badge Color', type: 'choice', options: ['indigo', 'emerald', 'amber', 'purple', 'rose', 'sky', 'zinc', 'cyan'] },
            { id: 'description', name: 'Description', type: 'text' },
          ],
          items: {
            create: [
              { sortOrder: 0, isActive: true, data: { label: 'Employee', code: 'EMPLOYEE', inverse_label: 'Employer', source_type: 'Person', target_type: 'Organisation', category: 'Employment', color: 'indigo', description: 'Direct employment relationship' } },
              { sortOrder: 1, isActive: true, data: { label: 'Director / Executive', code: 'DIRECTOR', inverse_label: 'Directorship', source_type: 'Person', target_type: 'Organisation', category: 'Governance', color: 'purple', description: 'Board of directors, officer, or executive governance' } },
              { sortOrder: 2, isActive: true, data: { label: 'Beneficial Owner / Shareholder', code: 'OWNER', inverse_label: 'Owned Entity', source_type: 'All', target_type: 'Organisation', category: 'Governance', color: 'emerald', description: 'Capital interest, equity holding, or legal ownership' } },
              { sortOrder: 3, isActive: true, data: { label: 'Subsidiary', code: 'SUBSIDIARY', inverse_label: 'Parent Company', source_type: 'Organisation', target_type: 'Organisation', category: 'Governance', color: 'sky', description: 'Controlled corporate entity or subsidiary' } },
              { sortOrder: 4, isActive: true, data: { label: 'Parent Company', code: 'PARENT_COMPANY', inverse_label: 'Subsidiary', source_type: 'Organisation', target_type: 'Organisation', category: 'Governance', color: 'sky', description: 'Holding entity or parent corporation' } },
              { sortOrder: 5, isActive: true, data: { label: 'Primary Contact', code: 'PRIMARY_CONTACT', inverse_label: 'Represented Entity', source_type: 'Person', target_type: 'Organisation', category: 'Commercial', color: 'cyan', description: 'Designated primary business contact or representative' } },
              { sortOrder: 6, isActive: true, data: { label: 'Billing Contact', code: 'BILLING_CONTACT', inverse_label: 'Client Account', source_type: 'Person', target_type: 'Organisation', category: 'Commercial', color: 'amber', description: 'Designated accounts and invoicing contact' } },
              { sortOrder: 7, isActive: true, data: { label: 'Partner / Alliance', code: 'PARTNER', inverse_label: 'Partner / Alliance', source_type: 'All', target_type: 'All', category: 'Commercial', color: 'indigo', description: 'Strategic, channel, or collaborative partner' } },
              { sortOrder: 8, isActive: true, data: { label: 'Contractor / Consultant', code: 'CONTRACTOR', inverse_label: 'Client', source_type: 'All', target_type: 'Organisation', category: 'Employment', color: 'amber', description: 'External service provider or independent contractor' } },
              { sortOrder: 9, isActive: true, data: { label: 'Advisor / Legal Counsel', code: 'ADVISOR', inverse_label: 'Advised Entity', source_type: 'All', target_type: 'All', category: 'Commercial', color: 'cyan', description: 'Legal, financial, or strategic advisor' } },
              { sortOrder: 10, isActive: true, data: { label: 'Supplier / Vendor', code: 'SUPPLIER', inverse_label: 'Purchaser', source_type: 'Organisation', target_type: 'Organisation', category: 'Commercial', color: 'amber', description: 'Vendor supplying goods or external services' } },
              { sortOrder: 11, isActive: true, data: { label: 'Client / Customer', code: 'CLIENT', inverse_label: 'Provider', source_type: 'All', target_type: 'Organisation', category: 'Commercial', color: 'emerald', description: 'Active client, customer, or account' } },
              { sortOrder: 12, isActive: true, data: { label: 'Spouse / Domestic Partner', code: 'SPOUSE', inverse_label: 'Spouse / Domestic Partner', source_type: 'Person', target_type: 'Person', category: 'Personal', color: 'rose', description: 'Legal spouse, domestic partner, or next of kin' } },
              { sortOrder: 13, isActive: true, data: { label: 'Parent', code: 'PARENT', inverse_label: 'Child', source_type: 'Person', target_type: 'Person', category: 'Personal', color: 'purple', description: 'Biological or legal parent' } },
              { sortOrder: 14, isActive: true, data: { label: 'Child', code: 'CHILD', inverse_label: 'Parent', source_type: 'Person', target_type: 'Person', category: 'Personal', color: 'purple', description: 'Biological or legal child' } },
            ],
          },
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    } catch (e) {
      console.error('[DirectoryGlobalLists] Error creating Relationship Types list:', e);
    }
  }

  return {
    classificationsList,
    industriesList,
    legalStructuresList,
    relationshipTypesList,
  };
}

router.get('/config', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settingsObj =
      tenant?.settings && typeof tenant.settings === 'object' ? (tenant.settings as any) : {};
    const directoryConfig = settingsObj.directoryConfig || {};

    const { classificationsList, industriesList, legalStructuresList, relationshipTypesList } =
      await ensureAndLoadDirectoryGlobalLists(tenantId, directoryConfig);

    const mappedClassifications = (classificationsList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      color: it.data?.color || 'indigo',
      description: it.data?.description || '',
    }));

    const mappedIndustries = (industriesList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      sector: it.data?.sector || it.data?.category || '',
    }));

    const mappedLegalStructures = (legalStructuresList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      description: it.data?.description || '',
    }));

    const mappedRelationshipTypes = (relationshipTypesList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      inverseLabel: it.data?.inverse_label || it.data?.inverseLabel || '',
      sourceType: it.data?.source_type || it.data?.sourceType || 'All',
      targetType: it.data?.target_type || it.data?.targetType || 'All',
      category: it.data?.category || 'General',
      color: it.data?.color || 'indigo',
      description: it.data?.description || '',
    }));

    const finalConfig = {
      customFields: directoryConfig.customFields || [],
      requireDeduplicationCheck: directoryConfig.requireDeduplicationCheck !== false,
      autoCreatePrimaryOrgRelationship: directoryConfig.autoCreatePrimaryOrgRelationship !== false,
      dedupeSchedule: directoryConfig.dedupeSchedule,
      classificationsListId: classificationsList?.id || null,
      industriesListId: industriesList?.id || null,
      legalStructuresListId: legalStructuresList?.id || null,
      relationshipTypesListId: relationshipTypesList?.id || null,
      // Backward compatible array of codes
      classifications: mappedClassifications.length > 0
        ? mappedClassifications.map((c: any) => c.code)
        : directoryConfig.classifications || [
            'CLIENT',
            'SUPPLIER',
            'PARTNER',
            'PROSPECT',
            'INVESTOR',
            'COMPETITOR',
            'REGULATOR',
            'CONTRACTOR',
            'SUBSIDIARY',
            'ADVISOR',
            'VIP',
          ],
      classificationDetails: mappedClassifications,
      industries: mappedIndustries,
      legalStructures: mappedLegalStructures,
      relationshipTypes: mappedRelationshipTypes,
    };

    res.json(finalConfig);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const currentSettings =
      tenant?.settings && typeof tenant.settings === 'object' ? (tenant.settings as any) : {};
    const currentDirConfig = currentSettings.directoryConfig || {};

    const updatedDirConfig = {
      ...currentDirConfig,
      ...(req.body || {}),
    };

    const updatedTenant = await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...currentSettings,
          directoryConfig: updatedDirConfig,
        },
      },
      select: { settings: true },
    });

    const savedConfig = (updatedTenant.settings as any)?.directoryConfig || updatedDirConfig;

    const { classificationsList, industriesList, legalStructuresList, relationshipTypesList } =
      await ensureAndLoadDirectoryGlobalLists(tenantId, savedConfig);

    const mappedClassifications = (classificationsList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      color: it.data?.color || 'indigo',
      description: it.data?.description || '',
    }));

    const mappedIndustries = (industriesList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      sector: it.data?.sector || it.data?.category || '',
    }));

    const mappedLegalStructures = (legalStructuresList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      description: it.data?.description || '',
    }));

    const mappedRelationshipTypes = (relationshipTypesList?.items || []).map((it: any) => ({
      id: it.id,
      label: it.data?.label || it.data?.name || it.data?.code,
      code: it.data?.code || it.data?.label || it.data?.name,
      inverseLabel: it.data?.inverse_label || it.data?.inverseLabel || '',
      sourceType: it.data?.source_type || it.data?.sourceType || 'All',
      targetType: it.data?.target_type || it.data?.targetType || 'All',
      category: it.data?.category || 'General',
      color: it.data?.color || 'indigo',
      description: it.data?.description || '',
    }));

    res.json({
      ...savedConfig,
      classificationsListId: classificationsList?.id || null,
      industriesListId: industriesList?.id || null,
      legalStructuresListId: legalStructuresList?.id || null,
      relationshipTypesListId: relationshipTypesList?.id || null,
      classifications: mappedClassifications.length > 0
        ? mappedClassifications.map((c: any) => c.code)
        : savedConfig.classifications,
      classificationDetails: mappedClassifications,
      industries: mappedIndustries,
      legalStructures: mappedLegalStructures,
      relationshipTypes: mappedRelationshipTypes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POST Bulk Operations (Status, Account Owner, Classification, Delete)
// ============================================================================
router.post('/bulk', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { ids, action, payload } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No party IDs provided' });
    }

    if (action === 'UPDATE_STATUS' && payload?.status) {
      const updated = await db.party.updateMany({
        where: { id: { in: ids }, tenantId },
        data: { status: payload.status },
      });
      return res.json({ success: true, count: updated.count });
    }

    if (action === 'ASSIGN_OWNER') {
      const updated = await db.party.updateMany({
        where: { id: { in: ids }, tenantId },
        data: { accountOwnerMemberId: payload?.accountOwnerMemberId || null },
      });
      return res.json({ success: true, count: updated.count });
    }

    if (action === 'ADD_CLASSIFICATION' && payload?.classification) {
      const tag = String(payload.classification).toUpperCase().trim();
      const targets = await db.party.findMany({
        where: { id: { in: ids }, tenantId },
        select: { id: true, classifications: true },
      });
      for (const t of targets) {
        const current = Array.isArray(t.classifications) ? t.classifications : [];
        if (!current.includes(tag)) {
          await db.party.update({
            where: { id: t.id },
            data: { classifications: [...current, tag] },
          });
        }
      }
      return res.json({ success: true, count: targets.length });
    }

    if (action === 'DELETE') {
      await db.$transaction([
        db.partyRelationship.deleteMany({
          where: { OR: [{ sourcePartyId: { in: ids } }, { targetPartyId: { in: ids } }] },
        }),
        db.person.deleteMany({ where: { partyId: { in: ids } } }),
        db.organization.deleteMany({ where: { partyId: { in: ids } } }),
        db.party.deleteMany({ where: { id: { in: ids }, tenantId } }),
      ]);
      return res.json({ success: true, count: ids.length });
    }

    res.status(400).json({ error: `Unsupported bulk action: ${action}` });
  } catch (err: any) {
    console.error('[POST /people-organisations/bulk] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET Pending Approvals
// ============================================================================
router.get('/approvals', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const pending = await db.party.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING_REVIEW',
      },
      include: {
        person: true,
        organization: true,
      },
    });
    res.json(pending.map((p) => enrichPartyRecord(p)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Deduplication Schedule & Automated Procedure Endpoints
// ============================================================================
router.get('/dedupe-schedule', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const schedule = await DedupeService.getScheduleConfig(tenantId);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/dedupe-schedule', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const updated = await DedupeService.updateScheduleConfig(tenantId, req.body || {});
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dedupe-schedule/run', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user?.uid || 'USER';
    const result = await DedupeService.runProcedure(tenantId, 'MANUAL', actorId);
    res.json(result);
  } catch (err: any) {
    console.error('[POST /people-organisations/dedupe-schedule/run] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET Potential Duplicates Across Tenant Directory
// ============================================================================
router.get('/duplicates', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const sensitivity = (req.query.sensitivity as any) || undefined;
    const { clusters } = await DedupeService.detectDuplicates(tenantId, sensitivity);
    res.json({ clusters, totalClusters: clusters.length });
  } catch (err: any) {
    console.error('[GET /people-organisations/duplicates] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET Fast MS365-Style Profile Hover Card Data
// ============================================================================
router.get('/:id/profile-card', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const party = await db.party.findUnique({
      where: { id, tenantId },
      include: {
        person: true,
        organization: true,
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Directory entity not found' });
    }

    // Fetch relationships, account owner, primary org/contact, and quick counts in parallel
    const [
      relationships,
      accountOwner,
      primaryOrg,
      primaryContact,
      openInvoices,
      openBills,
      posOrdersCount,
      notesCount,
      remindersCount,
      serviceDeskCount,
      modules,
      candidateRecords,
    ] = await Promise.all([
      db.partyRelationship.findMany({
        where: {
          tenantId,
          OR: [{ sourcePartyId: id }, { targetPartyId: id }],
        },
        include: {
          sourceParty: { include: { person: true, organization: true } },
          targetParty: { include: { person: true, organization: true } },
        },
        orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        take: 10,
      }),
      party.accountOwnerMemberId
        ? globalPrisma.tenantMember
            .findFirst({
              where: { id: party.accountOwnerMemberId, tenantId },
              select: {
                id: true,
                firstName: true,
                familyName: true,
                workEmail: true,
                personalEmail: true,
                avatarUrl: true,
                roleId: true,
                user: { select: { id: true, email: true } },
                position: { select: { title: true } },
                team: { select: { name: true } },
              },
            })
            .then((m) => formatTenantMember(m))
        : Promise.resolve(null),
      party.person?.primaryOrgPartyId
        ? db.party.findUnique({
            where: { id: party.person.primaryOrgPartyId },
            include: { organization: true },
          })
        : Promise.resolve(null),
      party.organization?.primaryContactPartyId
        ? db.party.findUnique({
            where: { id: party.organization.primaryContactPartyId },
            include: { person: true },
          })
        : Promise.resolve(null),
      db.invoice.findMany({
        where: { tenantId, customerPartyId: id, status: { not: 'VOID' } },
        select: { id: true, invoiceNumber: true, total: true, amountPaid: true, status: true, dueDate: true },
        orderBy: { issueDate: 'desc' },
        take: 10,
      }),
      db.bill.findMany({
        where: { tenantId, supplierPartyId: id, status: { not: 'VOID' } },
        select: { id: true, billNumber: true, total: true, amountPaid: true, status: true, dueDate: true },
        orderBy: { issueDate: 'desc' },
        take: 10,
      }),
      db.posOrder.count({ where: { tenantId, customerPartyId: id } }),
      globalPrisma.universalNote.count({ where: { tenantId, entityType: 'PARTY', entityId: id, isArchived: false } }),
      globalPrisma.universalReminder.count({
        where: { tenantId, entityType: 'PARTY', entityId: id, status: { not: 'COMPLETED' } },
      }),
      globalPrisma.serviceDeskSession.count({
        where: {
          tenantId,
          OR: [
            { partyId: id },
            ...(party.email ? [{ visitorEmail: { equals: party.email, mode: 'insensitive' as const } }] : []),
          ],
        },
      }),
      db.module.findMany({
        where: { tenantId },
        select: { id: true, name: true, icon: true, config: true },
      }),
      db.record.findMany({
        where: { tenantId },
        select: {
          id: true,
          moduleId: true,
          status: true,
          data: true,
          associations: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 250,
      }),
    ]);

    const moduleMap = new Map(modules.map((m) => [m.id, m]));
    const matchedRecords: any[] = [];

    for (const rec of candidateRecords) {
      const dataObj = (rec.data as Record<string, any>) || {};
      const assocs = Array.isArray(rec.associations) ? (rec.associations as any[]) : [];
      let matched = assocs.some((a) => a && (a.record_id === id || a.partyId === id || a.id === id));

      if (!matched) {
        for (const val of Object.values(dataObj)) {
          if (
            val === id ||
            (val && typeof val === 'object' && !Array.isArray(val) && (val as any).id === id) ||
            (Array.isArray(val) &&
              val.some((v) => v === id || (v && typeof v === 'object' && (v as any).id === id)))
          ) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        const mod = moduleMap.get(rec.moduleId);
        const modCfg = (mod?.config as Record<string, any>) || {};
        const titleFieldId = modCfg.titleFieldId;
        const resolvedTitle =
          (titleFieldId && dataObj[titleFieldId]) ||
          dataObj.name ||
          dataObj.title ||
          dataObj.subject ||
          dataObj._record_key ||
          `Record #${rec.id.slice(-6)}`;
        matchedRecords.push({
          id: rec.id,
          moduleId: rec.moduleId,
          moduleName: mod?.name || 'Module Record',
          moduleIcon: mod?.icon || 'FileText',
          recordKey: dataObj._record_key || `#${rec.id.slice(-6)}`,
          title: String(resolvedTitle),
          status: rec.status || dataObj.status || 'Active',
          updatedAt: rec.updatedAt,
        });
      }
    }

    // Resolve primary org or primary contact from relationships if not explicitly set on column
    let resolvedPrimaryOrg = primaryOrg ? enrichPartyRecord(primaryOrg) : null;
    let resolvedPrimaryContact = primaryContact ? enrichPartyRecord(primaryContact) : null;
    let resolvedRoleAtOrg = party.person?.jobTitle || null;

    if (party.partyType === 'PERSON' && !resolvedPrimaryOrg) {
      const orgRel = relationships.find(
        (r) =>
          (r.sourcePartyId === id && r.targetParty.partyType === 'ORGANIZATION') ||
          (r.targetPartyId === id && r.sourceParty.partyType === 'ORGANIZATION')
      );
      if (orgRel) {
        const orgEntity = orgRel.sourcePartyId === id ? orgRel.targetParty : orgRel.sourceParty;
        resolvedPrimaryOrg = enrichPartyRecord(orgEntity);
        if (!resolvedRoleAtOrg && orgRel.roleTitle) {
          resolvedRoleAtOrg = orgRel.roleTitle;
        }
      }
    } else if (party.partyType === 'ORGANIZATION' && !resolvedPrimaryContact) {
      const personRel = relationships.find(
        (r) =>
          (r.sourcePartyId === id && r.targetParty.partyType === 'PERSON') ||
          (r.targetPartyId === id && r.sourceParty.partyType === 'PERSON')
      );
      if (personRel) {
        const personEntity = personRel.sourcePartyId === id ? personRel.targetParty : personRel.sourceParty;
        resolvedPrimaryContact = enrichPartyRecord(personEntity);
      }
    }

    const totalInvoiced = openInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const totalPaid = openInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);
    const outstandingReceivables = Math.max(0, totalInvoiced - totalPaid);

    const totalBilled = openBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
    const totalBillsPaid = openBills.reduce((sum, b) => sum + Number(b.amountPaid || 0), 0);
    const outstandingPayables = Math.max(0, totalBilled - totalBillsPaid);

    const enrichedRelationships = relationships.map((rel) => {
      const isOutgoing = rel.sourcePartyId === id;
      const otherParty = enrichPartyRecord(isOutgoing ? rel.targetParty : rel.sourceParty);
      return {
        id: rel.id,
        relationshipType: rel.relationshipType,
        roleTitle: rel.roleTitle,
        department: rel.department,
        isPrimary: rel.isPrimary,
        ownershipPercentage: rel.ownershipPercentage ? Number(rel.ownershipPercentage) : null,
        direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
        otherParty: {
          id: otherParty.id,
          displayName: otherParty.displayName,
          partyType: otherParty.partyType,
          status: otherParty.status,
          email: otherParty.email,
          phone: otherParty.phone,
          avatarUrl: otherParty.avatarUrl,
          jobTitle: otherParty.person?.jobTitle || null,
          industry: otherParty.organization?.industry || null,
        },
      };
    });

    const enrichedParty = enrichPartyRecord(party);

    res.json({
      ...enrichedParty,
      accountOwner,
      primaryOrganization: resolvedPrimaryOrg
        ? {
            id: resolvedPrimaryOrg.id,
            displayName: resolvedPrimaryOrg.displayName,
            industry: resolvedPrimaryOrg.organization?.industry || null,
            taxIdentifier: resolvedPrimaryOrg.organization?.taxIdentifier || null,
            avatarUrl: resolvedPrimaryOrg.avatarUrl || null,
          }
        : null,
      primaryContact: resolvedPrimaryContact
        ? {
            id: resolvedPrimaryContact.id,
            displayName: resolvedPrimaryContact.displayName,
            jobTitle: resolvedPrimaryContact.person?.jobTitle || null,
            email: resolvedPrimaryContact.email || null,
            phone: resolvedPrimaryContact.phone || null,
            avatarUrl: resolvedPrimaryContact.avatarUrl || null,
          }
        : null,
      roleAtOrganization: resolvedRoleAtOrg,
      relationships: enrichedRelationships,
      financialSnapshot: {
        invoicesCount: openInvoices.length,
        totalInvoiced,
        outstandingReceivables,
        billsCount: openBills.length,
        outstandingPayables,
        posOrdersCount,
      },
      linkedSummary: {
        moduleRecordsCount: matchedRecords.length,
        recentModuleRecords: matchedRecords.slice(0, 5),
        recentInvoices: openInvoices.slice(0, 3).map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          total: Number(inv.total),
          balanceDue: Math.max(0, Number(inv.total) - Number(inv.amountPaid)),
          status: inv.status,
        })),
        notesCount,
        openRemindersCount: remindersCount,
        serviceDeskSessionsCount: serviceDeskCount,
        relationshipsCount: relationships.length,
        totalLinkedItems:
          matchedRecords.length +
          openInvoices.length +
          openBills.length +
          posOrdersCount +
          notesCount +
          remindersCount +
          serviceDeskCount +
          relationships.length,
      },
    });
  } catch (err: any) {
    console.error('[GET /people-organisations/:id/profile-card] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET Universal 360° "Anything Linked" Discovery Endpoint
// ============================================================================
router.get('/:id/linked-everything', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const includeRollup = req.query.includeRollup !== 'false'; // default true for Organizations

    const party = await db.party.findUnique({
      where: { id, tenantId },
      include: { person: true, organization: true },
    });

    if (!party) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // 1. Fetch all direct PartyRelationships
    const relationships = await db.partyRelationship.findMany({
      where: {
        tenantId,
        OR: [{ sourcePartyId: id }, { targetPartyId: id }],
      },
      include: {
        sourceParty: { include: { person: true, organization: true } },
        targetParty: { include: { person: true, organization: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
    });

    // Also find people whose primaryOrgPartyId === id
    const directOrgPeople =
      party.partyType === 'ORGANIZATION'
        ? await db.person.findMany({
            where: { primaryOrgPartyId: id, party: { tenantId } },
            include: { party: { include: { person: true, organization: true } } },
          })
        : [];

    // Build targetPartyIds set (includes related people/subsidiaries when includeRollup is true for an Organization)
    const targetPartyIds = new Set<string>([id]);
    const relatedPartyNameMap = new Map<string, string>();
    const mainEnriched = enrichPartyRecord(party);
    relatedPartyNameMap.set(id, mainEnriched.displayName);

    if (party.partyType === 'ORGANIZATION' && includeRollup) {
      for (const rel of relationships) {
        const other = enrichPartyRecord(rel.sourcePartyId === id ? rel.targetParty : rel.sourceParty);
        targetPartyIds.add(other.id);
        relatedPartyNameMap.set(other.id, other.displayName);
      }
      for (const p of directOrgPeople) {
        if (p.party) {
          const ep = enrichPartyRecord(p.party);
          targetPartyIds.add(ep.id);
          relatedPartyNameMap.set(ep.id, ep.displayName);
        }
      }
    }

    const partyIdArray = Array.from(targetPartyIds);

    // Collect emails for Inbox & Service Desk matching
    const targetEmails = new Set<string>();
    if (party.email) targetEmails.add(party.email.toLowerCase());
    if (party.secondaryEmail) targetEmails.add(party.secondaryEmail.toLowerCase());
    if (party.organization?.billingEmail) targetEmails.add(party.organization.billingEmail.toLowerCase());
    if (party.partyType === 'ORGANIZATION' && includeRollup) {
      for (const rel of relationships) {
        const other = rel.sourcePartyId === id ? rel.targetParty : rel.sourceParty;
        if (other.email) targetEmails.add(other.email.toLowerCase());
      }
      for (const p of directOrgPeople) {
        if (p.party?.email) targetEmails.add(p.party.email.toLowerCase());
      }
    }
    const emailList = Array.from(targetEmails).filter(Boolean);

    // 2. Stage 1 Parallel Queries: Modules, All Tenant Records, Financials, Inbox, Service Desk, Members
    const [
      modules,
      allRecords,
      invoices,
      bills,
      posOrders,
      paymentTransactions,
      refunds,
      returnRequests,
      vouchers,
      journalLines,
      inboxThreads,
      serviceDeskSessions,
      tenantMembers,
    ] = await Promise.all([
      db.module.findMany({
        where: { tenantId },
        select: { id: true, name: true, icon: true, config: true },
      }),
      db.record.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
      db.invoice.findMany({
        where: { tenantId, customerPartyId: { in: partyIdArray } },
        include: { lines: true, payments: true },
        orderBy: { issueDate: 'desc' },
      }),
      db.bill.findMany({
        where: { tenantId, supplierPartyId: { in: partyIdArray } },
        include: { lines: true },
        orderBy: { issueDate: 'desc' },
      }),
      db.posOrder.findMany({
        where: { tenantId, customerPartyId: { in: partyIdArray } },
        include: { items: true, payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.paymentTransaction.findMany({
        where: { tenantId, customerPartyId: { in: partyIdArray } },
        orderBy: { createdAt: 'desc' },
      }),
      db.refund.findMany({
        where: {
          tenantId,
          OR: [
            { paymentTransaction: { customerPartyId: { in: partyIdArray } } },
            { invoice: { customerPartyId: { in: partyIdArray } } },
            { posOrder: { customerPartyId: { in: partyIdArray } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.returnRequest.findMany({
        where: { tenantId, customerPartyId: { in: partyIdArray } },
        include: { items: true, refund: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.voucher.findMany({
        where: { tenantId, recipientPartyId: { in: partyIdArray } },
        include: { redemptions: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.journalLine.findMany({
        where: { contactPartyId: { in: partyIdArray }, journalEntry: { tenantId } },
        include: { journalEntry: true, account: true },
        take: 100,
      }),
      globalPrisma.inboxThread.findMany({
        where: { tenantId },
        include: {
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 5,
            select: {
              id: true,
              senderName: true,
              senderEmail: true,
              toRecipients: true,
              ccRecipients: true,
              subject: true,
              snippet: true,
              sentAt: true,
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
        take: 150,
      }),
      globalPrisma.serviceDeskSession.findMany({
        where: {
          tenantId,
          OR: [
            { partyId: { in: partyIdArray } },
            ...(emailList.length > 0 ? [{ visitorEmail: { in: emailList } }] : []),
          ],
        },
        include: {
          site: { select: { id: true, name: true } },
          feedbackCases: true,
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 100,
      }),
      globalPrisma.tenantMember.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          familyName: true,
          workEmail: true,
          personalEmail: true,
          avatarUrl: true,
          roleId: true,
          isSynthetic: true,
          user: { select: { id: true, email: true } },
          position: { select: { title: true } },
          team: { select: { name: true } },
        },
      }),
    ]);

    const memberMap = new Map(tenantMembers.map((m) => [m.id, formatTenantMember(m)]));

    // 3. Scan Dynamic Module Records & Resolve Lookup Field Metadata
    const moduleMetaMap = new Map<
      string,
      { id: string; name: string; icon: string; titleFieldId?: string; fieldsMap: Map<string, string> }
    >();
    for (const mod of modules) {
      const cfg = (mod.config as Record<string, any>) || {};
      const layoutSource = cfg.layout || cfg.tabs || cfg.fields || [];
      const flatFields = extractModuleFields(Array.isArray(layoutSource) ? layoutSource : []);
      const fMap = new Map<string, string>();
      for (const f of flatFields) {
        if (f.id) fMap.set(f.id, f.label || f.name || f.id);
        if (f.name) fMap.set(f.name, f.label || f.name);
      }
      moduleMetaMap.set(mod.id, {
        id: mod.id,
        name: mod.name,
        icon: mod.icon || 'Layers',
        titleFieldId: cfg.titleFieldId,
        fieldsMap: fMap,
      });
    }

    const matchedModuleRecords: any[] = [];
    const matchedRecordMap = new Map<string, any>();
    const extractedWorkflowEvents: any[] = [];
    const extractedRecordComments: any[] = [];

    for (const rec of allRecords) {
      const dataObj = (rec.data as Record<string, any>) || {};
      const assocs = Array.isArray(rec.associations) ? (rec.associations as any[]) : [];
      const modMeta = moduleMetaMap.get(rec.moduleId);
      const matchReasons: string[] = [];
      let matchedViaPartyId: string | null = null;

      // Check associations array
      for (const a of assocs) {
        const refId = a?.record_id || a?.partyId || a?.id;
        if (refId && targetPartyIds.has(refId)) {
          matchedViaPartyId = refId;
          matchReasons.push(a.relationship_type || 'Explicit Record Association');
        }
      }

      // Check every field in Record.data
      for (const [fieldKey, fieldVal] of Object.entries(dataObj)) {
        if (fieldKey.startsWith('_')) continue;
        if (typeof fieldVal === 'string' && targetPartyIds.has(fieldVal)) {
          matchedViaPartyId = fieldVal;
          const fieldLabel = modMeta?.fieldsMap.get(fieldKey) || fieldKey;
          matchReasons.push(`Field: ${fieldLabel}`);
        } else if (fieldVal && typeof fieldVal === 'object' && !Array.isArray(fieldVal)) {
          const objId = (fieldVal as any).id || (fieldVal as any).partyId;
          if (typeof objId === 'string' && targetPartyIds.has(objId)) {
            matchedViaPartyId = objId;
            const fieldLabel = modMeta?.fieldsMap.get(fieldKey) || fieldKey;
            matchReasons.push(`Field: ${fieldLabel}`);
          }
        } else if (Array.isArray(fieldVal)) {
          for (const item of fieldVal) {
            if (typeof item === 'string' && targetPartyIds.has(item)) {
              matchedViaPartyId = item;
              const fieldLabel = modMeta?.fieldsMap.get(fieldKey) || fieldKey;
              matchReasons.push(`Field: ${fieldLabel}`);
            } else if (item && typeof item === 'object') {
              for (const subVal of Object.values(item)) {
                if (typeof subVal === 'string' && targetPartyIds.has(subVal)) {
                  matchedViaPartyId = subVal;
                  const fieldLabel = modMeta?.fieldsMap.get(fieldKey) || fieldKey;
                  matchReasons.push(`Collection: ${fieldLabel}`);
                }
              }
            }
          }
        }
      }

      if (matchedViaPartyId) {
        const recordKey = dataObj._record_key || `#${rec.id.slice(-6)}`;
        const titleFieldId = modMeta?.titleFieldId;
        const title =
          (titleFieldId && dataObj[titleFieldId]) ||
          dataObj.name ||
          dataObj.title ||
          dataObj.subject ||
          dataObj.summary ||
          recordKey;

        const assigneeMember = dataObj.assigneeId ? memberMap.get(dataObj.assigneeId) : null;
        const route = `/workspace/modules/${rec.moduleId}/records/${rec.id}`;

        const recordSummary = {
          id: rec.id,
          moduleId: rec.moduleId,
          moduleName: modMeta?.name || 'Custom Module',
          moduleIcon: modMeta?.icon || 'Layers',
          recordKey,
          title: String(title),
          status: rec.status || dataObj.status || 'Active',
          assigneeName: assigneeMember?.name || dataObj.createdBy || null,
          assigneeAvatar: assigneeMember?.avatarUrl || null,
          matchReasons: Array.from(new Set(matchReasons)),
          linkedPartyId: matchedViaPartyId,
          linkedPartyName: relatedPartyNameMap.get(matchedViaPartyId) || mainEnriched.displayName,
          isIndirectRollup: matchedViaPartyId !== id,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
          route,
        };

        matchedModuleRecords.push(recordSummary);
        matchedRecordMap.set(rec.id, recordSummary);

        // Extract Workflow History events from this associated record
        const wfHistory = dataObj.workflowState?.history || (rec.workflowState as any)?.history;
        if (Array.isArray(wfHistory)) {
          wfHistory.forEach((wh: any, idx: number) => {
            if (!wh?.timestamp) return;
            extractedWorkflowEvents.push({
              id: `wf_${rec.id}_${idx}`,
              timestamp: new Date(wh.timestamp).toISOString(),
              eventType: 'WORKFLOW_TRANSITION',
              streamCategory: 'RECORDS_WORKFLOW',
              title: `Workflow ${wh.action || 'Transition'} on ${recordKey}`,
              description: `${wh.action || 'Transitioned'}${wh.nodeLabel ? ` to "${wh.nodeLabel}"` : ''}${
                wh.triggeredBy ? ` by ${wh.triggeredBy}` : ''
              }`,
              actor: {
                id: 'workflow',
                name: wh.triggeredBy || 'Workflow Engine',
                email: '',
                type: 'WORKFLOW',
              },
              targetRecord: {
                id: rec.id,
                recordKey,
                title: String(title),
                moduleId: rec.moduleId,
                moduleName: recordSummary.moduleName,
                url: route,
              },
              status: recordSummary.status,
            });
          });
        }

        // Extract Record Comments from this associated record
        const recComments = dataObj._comments;
        if (Array.isArray(recComments)) {
          recComments.forEach((c: any, idx: number) => {
            extractedRecordComments.push({
              id: `comment_${rec.id}_${c.id || idx}`,
              timestamp: c.createdAt || c.timestamp || rec.updatedAt.toISOString(),
              eventType: 'RECORD_COMMENT',
              streamCategory: 'CORRESPONDENCE',
              title: `Comment on ${recordKey} (${recordSummary.moduleName})`,
              description: c.text || c.body || c.content || '',
              actor: {
                id: c.authorId || 'user',
                name: c.authorName || c.author || 'Team Member',
                email: '',
                avatarUrl: c.authorAvatar || null,
                type: 'USER',
              },
              targetRecord: {
                id: rec.id,
                recordKey,
                title: String(title),
                moduleId: rec.moduleId,
                moduleName: recordSummary.moduleName,
                url: route,
              },
            });
          });
        }
      }
    }

    // 4. Stage 2 Deep Queries: Fetch AuditLogs, Documents, Notes, Reminders across BOTH Party IDs AND all Associated Module Record IDs!
    const allEcosystemResourceIds = Array.from(
      new Set([...partyIdArray, ...matchedModuleRecords.map((r) => r.id)])
    );
    const allEcosystemResourceIdSet = new Set(allEcosystemResourceIds);

    const [docLinks, generatedDocs, notes, reminders, auditLogs] = await Promise.all([
      globalPrisma.universalDocumentLink.findMany({
        where: { tenantId, recordId: { in: allEcosystemResourceIds } },
        include: { document: true },
        orderBy: { createdAt: 'desc' },
      }),
      globalPrisma.generatedDocument.findMany({
        where: { tenantId, recordId: { in: allEcosystemResourceIds } },
        orderBy: { generatedAt: 'desc' },
      }),
      globalPrisma.universalNote.findMany({
        where: {
          tenantId,
          isArchived: false,
          OR: [
            { entityType: 'PARTY', entityId: { in: partyIdArray } },
            { recordId: { in: allEcosystemResourceIds } },
          ],
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      }),
      globalPrisma.universalReminder.findMany({
        where: {
          tenantId,
          OR: [
            { entityType: 'PARTY', entityId: { in: partyIdArray } },
            { recordId: { in: allEcosystemResourceIds } },
          ],
        },
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      }),
      db.auditLog.findMany({
        where: { tenantId, resourceId: { in: allEcosystemResourceIds } },
        orderBy: { timestamp: 'desc' },
        take: 150,
      }),
    ]);

    // 4. Filter Inbox Threads matching partyId OR any associated module record ID in linkedRecords, OR sender/recipient email
    const matchedInboxThreads = inboxThreads
      .filter((t) => {
        const linked = Array.isArray(t.linkedRecords) ? (t.linkedRecords as any[]) : [];
        if (
          linked.some(
            (lr) => lr && allEcosystemResourceIdSet.has(lr.id || lr.recordId || lr.partyId)
          )
        ) {
          return true;
        }
        const msgs = Array.isArray(t.messages) ? t.messages : [];
        if (msgs.length > 0 && emailList.length > 0) {
          for (const msg of msgs) {
            if (msg.senderEmail && targetEmails.has(msg.senderEmail.toLowerCase())) {
              return true;
            }
            const toArr = Array.isArray(msg.toRecipients) ? (msg.toRecipients as any[]) : [];
            const ccArr = Array.isArray(msg.ccRecipients) ? (msg.ccRecipients as any[]) : [];
            for (const rec of [...toArr, ...ccArr]) {
              const addr = typeof rec === 'string' ? rec : rec?.email;
              if (addr && targetEmails.has(String(addr).toLowerCase())) {
                return true;
              }
            }
          }
        }
        return false;
      })
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        lastMessageAt: t.lastActivityAt,
        snippet: t.messages?.[0]?.snippet || t.snippet || '',
        fromName: t.messages?.[0]?.senderName || '',
        fromEmail: t.messages?.[0]?.senderEmail || '',
        messages: t.messages || [],
        route: `/workspace/apps/inbox?threadId=${t.id}`,
      }));

    // 5. Format Relationships
    const formattedRelationships = relationships.map((rel) => {
      const isOutgoing = rel.sourcePartyId === id;
      const otherParty = enrichPartyRecord(isOutgoing ? rel.targetParty : rel.sourceParty);
      return {
        id: rel.id,
        sourcePartyId: rel.sourcePartyId,
        targetPartyId: rel.targetPartyId,
        relationshipType: rel.relationshipType,
        roleTitle: rel.roleTitle,
        department: rel.department,
        isPrimary: rel.isPrimary,
        notes: rel.notes,
        ownershipPercentage: rel.ownershipPercentage ? Number(rel.ownershipPercentage) : null,
        validFrom: rel.validFrom,
        validTo: rel.validTo,
        direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
        otherParty: {
          id: otherParty.id,
          displayName: otherParty.displayName,
          partyType: otherParty.partyType,
          status: otherParty.status,
          email: otherParty.email,
          phone: otherParty.phone,
          avatarUrl: otherParty.avatarUrl,
          jobTitle: otherParty.person?.jobTitle || null,
          industry: otherParty.organization?.industry || null,
          classifications: otherParty.classifications || [],
        },
      };
    });

    // 6. Compute Financial & Ecosystem Summary Metrics
    const now = new Date();
    const totalInvoiced = invoices
      .filter((i) => i.status !== 'VOID')
      .reduce((acc, i) => acc + Number(i.total || 0), 0);
    const totalInvoicePaid = invoices
      .filter((i) => i.status !== 'VOID')
      .reduce((acc, i) => acc + Number(i.amountPaid || 0), 0);
    const outstandingAR = Math.max(0, totalInvoiced - totalInvoicePaid);
    const overdueAR = invoices
      .filter((i) => i.status !== 'VOID' && i.status !== 'PAID' && new Date(i.dueDate) < now)
      .reduce((acc, i) => acc + Math.max(0, Number(i.total || 0) - Number(i.amountPaid || 0)), 0);

    const totalBilled = bills
      .filter((b) => b.status !== 'VOID')
      .reduce((acc, b) => acc + Number(b.total || 0), 0);
    const totalBillsPaid = bills
      .filter((b) => b.status !== 'VOID')
      .reduce((acc, b) => acc + Number(b.amountPaid || 0), 0);
    const outstandingAP = Math.max(0, totalBilled - totalBillsPaid);

    const totalPosSpend = posOrders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    const documents = [
      ...docLinks
        .filter((dl) => dl.document)
        .map((dl) => {
          const linkedRec = dl.recordId ? matchedRecordMap.get(dl.recordId) : null;
          return {
            id: dl.document.id,
            linkId: dl.id,
            recordId: dl.recordId,
            recordKey: linkedRec?.recordKey || null,
            moduleName: linkedRec?.moduleName || null,
            name: dl.document.name,
            mimeType: dl.document.mimeType,
            sizeBytes: dl.document.sizeBytes,
            classification: dl.document.classification,
            documentType: dl.document.documentType,
            url: dl.document.url,
            createdAt: dl.createdAt,
            source: 'UNIVERSAL_DOCUMENT',
          };
        }),
      ...generatedDocs.map((gd) => {
        const linkedRec = gd.recordId ? matchedRecordMap.get(gd.recordId) : null;
        return {
          id: gd.id,
          linkId: gd.id,
          recordId: gd.recordId,
          recordKey: linkedRec?.recordKey || null,
          moduleName: linkedRec?.moduleName || null,
          name: gd.name,
          mimeType: 'application/pdf',
          sizeBytes: 0,
          classification: 'INTERNAL',
          documentType: 'GENERATED_DOCUMENT',
          url: gd.url,
          createdAt: gd.generatedAt,
          source: 'GENERATED_DOCUMENT',
        };
      }),
    ];

    // 7. Build Whole-of-Aurora Chronological Live Activity & Correspondence Feed
    const activityFeed: any[] = [];

    // 7a. AuditLog events (on Party AND on all Associated Module Records like LIC-9, ICT-18, SUB-60)
    for (const log of auditLogs) {
      const newVal = (log.newValue || {}) as any;
      const linkedRec = matchedRecordMap.get(log.resourceId);

      let actor = newVal.actor;
      if (!actor || !actor.name || actor.name === 'System') {
        const member = memberMap.get(log.actorId);
        if (member) {
          actor = {
            id: member.id,
            name: member.name,
            email: member.email,
            avatarUrl: member.avatarUrl,
            role: member.role,
            type: 'USER',
          };
        } else {
          actor = {
            id: log.actorId,
            name: log.actorId === 'system' || log.actorId === 'SYSTEM' ? 'System Workflow' : log.actorId,
            email: '',
            type: log.actorId === 'system' || log.actorId === 'SYSTEM' ? 'SYSTEM' : 'USER',
          };
        }
      }

      const isViewEvent = log.action === 'RECORD_VIEWED' || newVal.category === 'ACCESS';
      const targetRecord = linkedRec
        ? {
            id: linkedRec.id,
            recordKey: linkedRec.recordKey,
            title: linkedRec.title,
            moduleId: linkedRec.moduleId,
            moduleName: linkedRec.moduleName,
            url: linkedRec.route,
          }
        : newVal.moduleId && log.resourceId !== id
        ? {
            id: log.resourceId,
            recordKey: newVal.resourceKey || `#${log.resourceId.slice(-6)}`,
            title: newVal.resourceTitle || newVal.resourceKey || 'Record',
            moduleId: newVal.moduleId,
            moduleName: newVal.moduleName || 'Module',
            url: `/workspace/modules/${newVal.moduleId}/records/${log.resourceId}`,
          }
        : null;

      const readableAction =
        newVal.description ||
        (log.action === 'PEOPLE_ORG_CREATE'
          ? `Registered ${mainEnriched.displayName} in Master Directory`
          : log.action === 'PEOPLE_ORG_UPDATE'
          ? `Updated directory profile for ${mainEnriched.displayName}`
          : log.action === 'STATUS_CHANGED'
          ? `Status changed on ${targetRecord?.recordKey || mainEnriched.displayName}`
          : log.action === 'ASSIGNMENT_CHANGED'
          ? `Assignment updated on ${targetRecord?.recordKey || mainEnriched.displayName}`
          : log.action === 'FIELD_UPDATED'
          ? `Updated fields on ${targetRecord?.recordKey || mainEnriched.displayName}`
          : `${log.action.replace(/_/g, ' ')}`);

      activityFeed.push({
        id: `audit_${log.id}`,
        timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
        eventType: log.action,
        streamCategory: isViewEvent ? 'ACCESS' : 'RECORDS_WORKFLOW',
        title: readableAction,
        description: targetRecord
          ? `${targetRecord.moduleName} • ${targetRecord.recordKey} (${targetRecord.title})`
          : `Directory Profile • ${mainEnriched.displayName}`,
        actor,
        targetRecord,
        changes: Array.isArray(newVal.changes) ? newVal.changes : [],
        status: linkedRec?.status || null,
      });
    }

    // 7b. Associated Record Creation events & Relationship Governance events
    for (const rel of formattedRelationships) {
      activityFeed.push({
        id: `relevent_${rel.id}`,
        timestamp: new Date(rel.validFrom || new Date()).toISOString(),
        eventType: 'RELATIONSHIP_CONNECTED',
        streamCategory: 'RECORDS_WORKFLOW',
        title: `Entity Relationship Established: ${rel.otherParty.displayName} (${rel.relationshipType})`,
        description: `${rel.direction === 'OUTGOING' ? 'Connected to' : 'Connected from'} ${
          rel.otherParty.displayName
        }${rel.roleTitle ? ` • Role: ${rel.roleTitle}` : ''}${
          rel.ownershipPercentage ? ` • ${rel.ownershipPercentage}% Ownership Equity` : ''
        }`,
        actor: {
          id: 'governance',
          name: 'Corporate Governance',
          email: '',
          type: 'SYSTEM',
        },
        targetRecord: {
          id: rel.otherParty.id,
          recordKey: rel.relationshipType,
          title: rel.otherParty.displayName,
          moduleId: 'directory',
          moduleName: 'Master Directory',
          url: `/workspace/apps/directory/${rel.otherParty.id}`,
        },
        status: rel.otherParty.status,
      });
    }

    for (const mr of matchedModuleRecords) {
      activityFeed.push({
        id: `reccreate_${mr.id}`,
        timestamp: new Date(mr.createdAt).toISOString(),
        eventType: 'RECORD_CREATED',
        streamCategory: 'RECORDS_WORKFLOW',
        title: `Associated Record Created: ${mr.recordKey} — ${mr.title}`,
        description: `Linked in ${mr.moduleName} via ${mr.matchReasons.join(', ') || 'Directory Lookup'}`,
        actor: {
          id: 'user',
          name: mr.assigneeName || 'Aurora Operator',
          email: '',
          avatarUrl: mr.assigneeAvatar,
          type: 'USER',
        },
        targetRecord: {
          id: mr.id,
          recordKey: mr.recordKey,
          title: mr.title,
          moduleId: mr.moduleId,
          moduleName: mr.moduleName,
          url: mr.route,
        },
        status: mr.status,
      });
    }

    // 7c. Extracted Workflow Transitions & Record Comments from associated records
    activityFeed.push(...extractedWorkflowEvents, ...extractedRecordComments);

    // 7d. Correspondence: Individual Email Messages & Service Desk Sessions
    for (const thread of matchedInboxThreads) {
      const msgs = Array.isArray(thread.messages) && thread.messages.length > 0 ? thread.messages : [null];
      for (const msg of msgs) {
        const isOutbound =
          msg?.senderEmail && !targetEmails.has(msg.senderEmail.toLowerCase());
        const ts = msg?.sentAt || thread.lastMessageAt || new Date();
        activityFeed.push({
          id: `emailmsg_${msg?.id || thread.id}`,
          timestamp: new Date(ts).toISOString(),
          eventType: 'EMAIL_CORRESPONDENCE',
          streamCategory: 'CORRESPONDENCE',
          title: `${isOutbound ? 'Sent Email' : 'Received Email'}: ${thread.subject || '(No Subject)'}`,
          description: msg?.snippet || thread.snippet || '',
          actor: {
            id: msg?.senderEmail || 'email',
            name: msg?.senderName || msg?.senderEmail || 'Email Correspondent',
            email: msg?.senderEmail || '',
            type: 'USER',
          },
          targetRecord: {
            id: thread.id,
            recordKey: 'INBOX',
            title: thread.subject || 'Email Thread',
            moduleId: 'inbox',
            moduleName: 'Aurora Inbox',
            url: thread.route,
          },
          status: thread.status,
        });
      }
    }

    for (const sd of serviceDeskSessions) {
      activityFeed.push({
        id: `sd_event_${sd.id}`,
        timestamp: new Date(sd.lastMessageAt || sd.createdAt).toISOString(),
        eventType: 'SERVICE_DESK_SESSION',
        streamCategory: 'CORRESPONDENCE',
        title: `Service Desk ${sd.channelType} Session (${sd.status})`,
        description:
          sd.aiSummary ||
          sd.wrapUpNotes ||
          sd.lastMessagePreview ||
          `Visitor interaction via ${sd.site?.name || 'Service Desk'}`,
        actor: {
          id: sd.allocatedMemberId || sd.allocatedAgentId || 'sd',
          name: sd.allocatedMemberName || sd.allocatedAgentName || sd.visitorName || 'Service Desk',
          email: sd.visitorEmail || '',
          type: sd.allocatedAgentId ? 'AI_AGENT' : 'USER',
        },
        targetRecord: {
          id: sd.id,
          recordKey: sd.channelType,
          title: sd.visitorName || sd.visitorEmail || 'Session',
          moduleId: 'service-desk',
          moduleName: 'Service Desk',
          url: `/workspace/apps/service-desk?sessionId=${sd.id}`,
        },
        status: sd.status,
      });
    }

    // 7e. Generated Documents & Attached Files (Correspondence Letters, Licences, Contracts)
    for (const doc of documents) {
      activityFeed.push({
        id: `docevent_${doc.linkId || doc.id}`,
        timestamp: new Date(doc.createdAt).toISOString(),
        eventType:
          doc.source === 'GENERATED_DOCUMENT' ? 'DOCUMENT_GENERATED' : 'DOCUMENT_ATTACHED',
        streamCategory: 'DOCUMENTS',
        title: `${
          doc.source === 'GENERATED_DOCUMENT' ? 'Generated Correspondence / Document' : 'Attached Document'
        }: ${doc.name}`,
        description: `${doc.documentType} (${doc.classification})${
          doc.recordKey ? ` • Attached to ${doc.recordKey} (${doc.moduleName})` : ''
        }`,
        actor: {
          id: 'doc',
          name: 'Document Engine',
          email: '',
          type: 'SYSTEM',
        },
        targetRecord: {
          id: doc.id,
          recordKey: doc.recordKey || 'DOC',
          title: doc.name,
          moduleId: 'documents',
          moduleName: doc.moduleName || 'Records Management',
          url: doc.url || '/workspace/platform/records-management',
        },
      });
    }

    // 7f. Financial Events (Invoices, Payments, Bills, POS Orders)
    for (const inv of invoices) {
      activityFeed.push({
        id: `invevent_${inv.id}`,
        timestamp: new Date(inv.issueDate || inv.createdAt).toISOString(),
        eventType: 'INVOICE_ISSUED',
        streamCategory: 'FINANCIALS',
        title: `Invoice Issued: ${inv.invoiceNumber} ($${Number(inv.total).toLocaleString()})`,
        description: `Status: ${inv.status} • Paid: $${Number(inv.amountPaid).toLocaleString()} • Due ${new Date(
          inv.dueDate
        ).toLocaleDateString()}`,
        actor: { id: 'finance', name: 'Accounts Receivable', email: '', type: 'SYSTEM' },
        targetRecord: {
          id: inv.id,
          recordKey: inv.invoiceNumber,
          title: `Invoice ${inv.invoiceNumber}`,
          moduleId: 'finance',
          moduleName: 'Financials (AR)',
          url: '/workspace/platform/finance',
        },
        amount: Number(inv.total),
        status: inv.status,
      });
    }

    for (const pt of paymentTransactions) {
      activityFeed.push({
        id: `payevent_${pt.id}`,
        timestamp: new Date(pt.createdAt).toISOString(),
        eventType: 'PAYMENT_RECEIVED',
        streamCategory: 'FINANCIALS',
        title: `Payment Transaction: ${pt.transactionRef} ($${Number(pt.grossAmount).toLocaleString()})`,
        description: `${pt.paymentMethod} via ${pt.channel} • Status: ${pt.status}`,
        actor: { id: 'payments', name: 'Payment Gateway', email: '', type: 'SYSTEM' },
        targetRecord: {
          id: pt.id,
          recordKey: pt.transactionRef,
          title: `Payment ${pt.transactionRef}`,
          moduleId: 'transactions',
          moduleName: 'Payments',
          url: '/workspace/platform/transactions',
        },
        amount: Number(pt.grossAmount),
        status: pt.status,
      });
    }

    for (const bill of bills) {
      activityFeed.push({
        id: `billevent_${bill.id}`,
        timestamp: new Date(bill.issueDate || bill.createdAt).toISOString(),
        eventType: 'BILL_RECEIVED',
        streamCategory: 'FINANCIALS',
        title: `Supplier Bill: ${bill.billNumber} ($${Number(bill.total).toLocaleString()})`,
        description: `Status: ${bill.status} • Due ${new Date(bill.dueDate).toLocaleDateString()}`,
        actor: { id: 'finance', name: 'Accounts Payable', email: '', type: 'SYSTEM' },
        targetRecord: {
          id: bill.id,
          recordKey: bill.billNumber,
          title: `Bill ${bill.billNumber}`,
          moduleId: 'finance',
          moduleName: 'Financials (AP)',
          url: '/workspace/platform/finance',
        },
        amount: Number(bill.total),
        status: bill.status,
      });
    }

    for (const pos of posOrders) {
      activityFeed.push({
        id: `posevent_${pos.id}`,
        timestamp: new Date(pos.createdAt).toISOString(),
        eventType: 'POS_ORDER',
        streamCategory: 'FINANCIALS',
        title: `POS Order Completed: ${pos.orderNumber} ($${Number(pos.total).toLocaleString()})`,
        description: `${pos.items?.length || 0} items purchased`,
        actor: { id: 'pos', name: 'Point of Sale', email: '', type: 'SYSTEM' },
        targetRecord: {
          id: pos.id,
          recordKey: pos.orderNumber,
          title: `POS Order ${pos.orderNumber}`,
          moduleId: 'pos',
          moduleName: 'Point of Sale',
          url: '/workspace/apps/pos',
        },
        amount: Number(pos.total),
        status: pos.status,
      });
    }

    // 7g. Notes & Reminders across the entity and its associated records
    for (const n of notes) {
      const linkedRec = n.recordId ? matchedRecordMap.get(n.recordId) : null;
      activityFeed.push({
        id: `noteevent_${n.id}`,
        timestamp: new Date(n.updatedAt || n.createdAt).toISOString(),
        eventType: 'NOTE_ADDED',
        streamCategory: 'NOTES_TASKS',
        title: `Note: ${n.title || 'Entity Note'}${linkedRec ? ` (on ${linkedRec.recordKey})` : ''}`,
        description: n.body || n.snippet || '',
        actor: {
          id: n.authorId || 'user',
          name: n.authorName || 'Team Member',
          email: n.authorEmail || '',
          avatarUrl: n.authorAvatar || null,
          type: 'USER',
        },
        targetRecord: linkedRec
          ? {
              id: linkedRec.id,
              recordKey: linkedRec.recordKey,
              title: linkedRec.title,
              moduleId: linkedRec.moduleId,
              moduleName: linkedRec.moduleName,
              url: linkedRec.route,
            }
          : null,
      });
    }

    for (const r of reminders) {
      const linkedRec = r.recordId ? matchedRecordMap.get(r.recordId) : null;
      activityFeed.push({
        id: `remevent_${r.id}`,
        timestamp: new Date(r.createdAt).toISOString(),
        eventType: 'REMINDER_SCHEDULED',
        streamCategory: 'NOTES_TASKS',
        title: `Task / Reminder: ${r.title}${linkedRec ? ` (on ${linkedRec.recordKey})` : ''}`,
        description: `Due ${new Date(r.dueAt).toLocaleString()} • Status: ${r.status}`,
        actor: {
          id: r.createdById || 'user',
          name: r.createdByName || 'Team Member',
          email: '',
          type: 'USER',
        },
        targetRecord: linkedRec
          ? {
              id: linkedRec.id,
              recordKey: linkedRec.recordKey,
              title: linkedRec.title,
              moduleId: linkedRec.moduleId,
              moduleName: linkedRec.moduleName,
              url: linkedRec.route,
            }
          : null,
        status: r.status,
      });
    }

    // Sort activityFeed newest-first
    activityFeed.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const operationalActivityCount = activityFeed.filter(
      (e) => e.streamCategory !== 'ACCESS'
    ).length;

    const counts = {
      total:
        matchedModuleRecords.length +
        formattedRelationships.length +
        invoices.length +
        bills.length +
        posOrders.length +
        paymentTransactions.length +
        refunds.length +
        returnRequests.length +
        vouchers.length +
        journalLines.length +
        matchedInboxThreads.length +
        serviceDeskSessions.length +
        documents.length +
        notes.length +
        reminders.length,
      activityEvents: operationalActivityCount,
      totalActivityWithViews: activityFeed.length,
      moduleRecords: matchedModuleRecords.length,
      relationships: formattedRelationships.length,
      invoices: invoices.length,
      bills: bills.length,
      posOrders: posOrders.length,
      payments: paymentTransactions.length,
      refunds: refunds.length,
      rmas: returnRequests.length,
      transactions: paymentTransactions.length + refunds.length,
      returns: returnRequests.length,
      vouchers: vouchers.length,
      journalLines: journalLines.length,
      emails: matchedInboxThreads.length,
      inboxThreads: matchedInboxThreads.length,
      serviceDeskSessions: serviceDeskSessions.length,
      documents: documents.length,
      notes: notes.length,
      reminders: reminders.length,
    };

    const financialSummary = {
      totalInvoiced,
      totalInvoicePaid,
      outstandingAR,
      overdueAR,
      totalBilled,
      outstandingAP,
      totalPosSpend,
      totalLifetimeRevenue: totalInvoicePaid + totalPosSpend,
    };

    const summary = {
      totalLinkedCount: counts.total,
      counts,
      financials: financialSummary,
    };

    // Build unified items array for the 360° Associated Records & Ecosystem view
    const items: any[] = [
      ...matchedModuleRecords.map((mr) => ({
        id: `mod_${mr.id}`,
        recordId: mr.id,
        recordKey: mr.recordKey,
        category: 'MODULE_RECORD',
        moduleName: mr.moduleName,
        title: `${mr.recordKey} — ${mr.title}`,
        subtitle: `${mr.moduleName} • Status: ${mr.status}${
          mr.assigneeName ? ` • Assigned: ${mr.assigneeName}` : ''
        }`,
        linkedVia: mr.matchReasons.join(', ') || 'Lookup Reference',
        status: mr.status,
        date: mr.updatedAt,
        url: mr.route,
        isRolledUp: mr.isIndirectRollup,
        rolledUpFromPartyName: mr.linkedPartyName,
      })),
      ...formattedRelationships.map((rel) => ({
        id: `rel_${rel.id}`,
        category: 'RELATIONSHIP',
        title: rel.otherParty.displayName,
        subtitle: `${rel.relationshipType}${rel.roleTitle ? ` • ${rel.roleTitle}` : ''}${
          rel.ownershipPercentage ? ` (${rel.ownershipPercentage}% Ownership)` : ''
        }`,
        linkedVia: `${rel.direction} Relationship`,
        status: rel.otherParty.status,
        date: rel.validFrom,
        url: `/workspace/apps/directory/${rel.otherParty.id}`,
      })),
      ...invoices.map((inv) => ({
        id: `inv_${inv.id}`,
        category: 'INVOICE',
        title: `Invoice ${inv.invoiceNumber}`,
        subtitle: `Due ${new Date(inv.dueDate).toLocaleDateString()} • Paid $${Number(
          inv.amountPaid || 0
        ).toLocaleString()}`,
        linkedVia: 'Customer Receivable (AR)',
        status: inv.status,
        amount: Number(inv.total || 0),
        date: inv.issueDate,
        url: '/workspace/platform/finance',
      })),
      ...bills.map((b) => ({
        id: `bill_${b.id}`,
        category: 'BILL',
        title: `Supplier Bill ${b.billNumber}`,
        subtitle: `Due ${new Date(b.dueDate).toLocaleDateString()}`,
        linkedVia: 'Supplier Payable (AP)',
        status: b.status,
        amount: Number(b.total || 0),
        date: b.issueDate,
        url: '/workspace/platform/finance',
      })),
      ...posOrders.map((o) => ({
        id: `pos_${o.id}`,
        category: 'POS_ORDER',
        title: `POS Order ${o.orderNumber}`,
        subtitle: `${o.items?.length || 0} line items`,
        linkedVia: 'Point of Sale Customer',
        status: o.status,
        amount: Number(o.total || 0),
        date: o.createdAt,
        url: '/workspace/apps/pos',
      })),
      ...paymentTransactions.map((pt) => ({
        id: `pay_${pt.id}`,
        category: 'PAYMENT',
        title: `Payment ${pt.transactionRef}`,
        subtitle: `${pt.paymentMethod} (${pt.channel})`,
        linkedVia: 'Payment Transaction',
        status: pt.status,
        amount: Number(pt.grossAmount || 0),
        date: pt.createdAt,
        url: '/workspace/platform/transactions',
      })),
      ...matchedInboxThreads.map((t) => ({
        id: `email_${t.id}`,
        category: 'EMAIL_THREAD',
        title: t.subject || '(No Subject)',
        subtitle: t.snippet || t.fromEmail,
        linkedVia: `Email (${t.fromEmail})`,
        status: t.status,
        date: t.lastMessageAt,
        url: t.route,
      })),
      ...serviceDeskSessions.map((sd) => ({
        id: `sd_${sd.id}`,
        category: 'SERVICE_DESK',
        title: `${sd.channelType} Session — ${sd.visitorName || sd.visitorEmail || 'Visitor'}`,
        subtitle: sd.aiSummary || sd.lastMessagePreview || 'Service Desk interaction',
        linkedVia: 'Service Desk Session',
        status: sd.status,
        date: sd.lastMessageAt || sd.createdAt,
        url: `/workspace/apps/service-desk?sessionId=${sd.id}`,
      })),
      ...documents.map((doc) => ({
        id: `doc_${doc.id}`,
        category: 'DOCUMENT',
        title: doc.name,
        subtitle: `${doc.documentType} • ${doc.classification}${
          doc.recordKey ? ` • ${doc.recordKey}` : ''
        }`,
        linkedVia: doc.recordKey ? `Attached to ${doc.recordKey}` : doc.source,
        date: doc.createdAt,
        url: doc.url || '/workspace/platform/records-management',
      })),
      ...notes.map((n) => ({
        id: `note_${n.id}`,
        category: 'NOTE',
        title: n.title || 'Entity Note',
        subtitle: n.body || n.snippet || '',
        linkedVia: 'Pinned Entity Note',
        date: n.updatedAt || n.createdAt,
      })),
      ...reminders.map((r) => ({
        id: `rem_${r.id}`,
        category: 'REMINDER',
        title: r.title,
        subtitle: `Due ${new Date(r.dueAt).toLocaleString()}`,
        linkedVia: 'Follow-Up Task',
        status: r.status,
        date: r.dueAt,
      })),
    ];

    res.json({
      partyId: id,
      includeRollup,
      rolledUpPartyCount: targetPartyIds.size,
      counts,
      financialSummary,
      items,
      activityFeed,
      summary,
      moduleRecords: matchedModuleRecords,
      relationships: formattedRelationships,
      invoices: invoices.map((inv) => ({
        ...inv,
        total: Number(inv.total),
        amountPaid: Number(inv.amountPaid),
        balanceDue: Math.max(0, Number(inv.total) - Number(inv.amountPaid)),
      })),
      bills: bills.map((b) => ({
        ...b,
        total: Number(b.total),
        amountPaid: Number(b.amountPaid),
        balanceDue: Math.max(0, Number(b.total) - Number(b.amountPaid)),
      })),
      posOrders: posOrders.map((o) => ({
        ...o,
        total: Number(o.total),
      })),
      paymentTransactions: paymentTransactions.map((pt) => ({
        ...pt,
        amount: Number(pt.grossAmount || 0),
        netAmount: Number(pt.netAmount || 0),
      })),
      refunds: refunds.map((rf) => ({
        ...rf,
        amount: Number(rf.amount),
      })),
      returnRequests: returnRequests.map((rr) => ({
        ...rr,
        refundAmount: Number(rr.refund?.amount || 0),
      })),
      vouchers: vouchers.map((v) => ({
        ...v,
        initialBalance: Number(v.initialBalance),
        currentBalance: Number(v.currentBalance),
      })),
      journalLines: journalLines.map((jl) => ({
        id: jl.id,
        debit: Number(jl.debit),
        credit: Number(jl.credit),
        description: jl.description || jl.journalEntry?.narration,
        entryNumber: jl.journalEntry?.entryNumber,
        date: jl.journalEntry?.date,
        sourceModule: jl.journalEntry?.sourceModule,
        accountName: jl.account?.accountName,
        accountCode: jl.account?.accountCode,
      })),
      inboxThreads: matchedInboxThreads,
      serviceDeskSessions,
      documents,
      notes: notes.map((n) => ({
        ...n,
        content: n.body || n.snippet || '',
      })),
      reminders,
      auditLogs,
    });
  } catch (err: any) {
    console.error('[GET /people-organisations/:id/linked-everything] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET Single Person/Organisation
// ============================================================================
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    const party = await db.party.findUnique({
      where: { id, tenantId: req.tenantId },
      include: {
        person: true,
        organization: true,
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Record not found' });
    }

    let accountOwner = null;
    if (party.accountOwnerMemberId) {
      const rawOwner = await globalPrisma.tenantMember.findFirst({
        where: { id: party.accountOwnerMemberId, tenantId: req.tenantId },
        select: {
          id: true,
          firstName: true,
          familyName: true,
          workEmail: true,
          personalEmail: true,
          avatarUrl: true,
          roleId: true,
          user: { select: { id: true, email: true } },
          position: { select: { title: true } },
          team: { select: { name: true } },
        },
      });
      accountOwner = formatTenantMember(rawOwner);
    }

    let contacts: any[] = [];
    if (party.partyType === 'ORGANIZATION') {
      const affiliatedPeople = await db.person.findMany({
        where: {
          primaryOrgPartyId: id,
          party: { tenantId: req.tenantId },
        },
        include: {
          party: true,
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });

      contacts = affiliatedPeople.map((p) => {
        const enriched = enrichPartyRecord(p.party);
        return {
          ...enriched,
          person: p,
          isPrimaryContact: party.organization?.primaryContactPartyId === p.partyId,
        };
      });
    }

    res.json({
      ...enrichPartyRecord(party),
      accountOwner,
      contacts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Organisation Contacts Management Routes
// ============================================================================
router.post('/:id/contacts', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    const { personPartyId, setAsPrimary } = req.body;

    if (!personPartyId) {
      return res.status(400).json({ error: 'personPartyId is required' });
    }

    const orgParty = await db.party.findUnique({
      where: { id, tenantId: req.tenantId },
      include: { organization: true },
    });
    if (!orgParty || orgParty.partyType !== 'ORGANIZATION') {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    const personParty = await db.party.findUnique({
      where: { id: personPartyId, tenantId: req.tenantId },
      include: { person: true },
    });
    if (!personParty || personParty.partyType !== 'PERSON') {
      return res.status(404).json({ error: 'Person not found' });
    }

    const orgName = orgParty.organization?.legalName || orgParty.displayName || 'Organisation';

    await db.person.update({
      where: { partyId: personPartyId },
      data: {
        primaryOrgPartyId: id,
        primaryOrgName: orgName,
      },
    });

    if (setAsPrimary) {
      await db.organization.update({
        where: { partyId: id },
        data: { primaryContactPartyId: personPartyId },
      });
    }

    res.json({ success: true, message: 'Contact linked to organisation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/contacts/:personPartyId', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id, personPartyId } = req.params;

    const orgParty = await db.party.findUnique({
      where: { id, tenantId: req.tenantId },
      include: { organization: true },
    });
    if (!orgParty) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    await db.person.update({
      where: { partyId: personPartyId },
      data: {
        primaryOrgPartyId: null,
        primaryOrgName: null,
      },
    });

    if (orgParty.organization?.primaryContactPartyId === personPartyId) {
      await db.organization.update({
        where: { partyId: id },
        data: { primaryContactPartyId: null },
      });
    }

    res.json({ success: true, message: 'Contact unlinked from organisation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/primary-contact', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    const { personPartyId } = req.body;

    const orgParty = await db.party.findUnique({
      where: { id, tenantId: req.tenantId },
      include: { organization: true },
    });
    if (!orgParty || orgParty.partyType !== 'ORGANIZATION') {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    if (personPartyId) {
      const personParty = await db.party.findUnique({
        where: { id: personPartyId, tenantId: req.tenantId },
        include: { person: true },
      });
      if (!personParty || personParty.partyType !== 'PERSON') {
        return res.status(404).json({ error: 'Person not found' });
      }

      if (personParty.person && personParty.person.primaryOrgPartyId !== id) {
        await db.person.update({
          where: { partyId: personPartyId },
          data: {
            primaryOrgPartyId: id,
            primaryOrgName: orgParty.organization?.legalName || orgParty.displayName || null,
          },
        });
      }
    }

    await db.organization.update({
      where: { partyId: id },
      data: { primaryContactPartyId: personPartyId || null },
    });

    res.json({ success: true, primaryContactPartyId: personPartyId || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POST Create Person/Organisation (with Resilient Deduplication Guardrail)
// ============================================================================
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const body = PeopleOrgCreateSchema.parse(req.body);

    const computedDisplayName =
      body.displayName ||
      (body.partyType === 'PERSON'
        ? `${body.person?.firstName || ''} ${body.person?.lastName || ''}`.trim()
        : body.organization?.legalName || body.organization?.tradingName) ||
      'Unnamed Entity';

    // 1. Resilient Deduplication Guardrail (Exact email/taxId check + optional pgvector semantic check)
    if (!body.skipDeduplication) {
      if (body.email && body.email.trim()) {
        const existingEmailMatch = await db.party.findFirst({
          where: {
            tenantId,
            email: { equals: body.email.trim(), mode: 'insensitive' },
          },
        });
        if (existingEmailMatch) {
          return res.status(409).json({
            error: `An entity with email "${body.email.trim()}" already exists in the Directory.`,
            existingPartyId: existingEmailMatch.id,
          });
        }
      }

      if (body.partyType === 'ORGANIZATION' && body.organization?.taxIdentifier?.trim()) {
        const existingTaxMatch = await db.party.findFirst({
          where: {
            tenantId,
            organization: {
              taxIdentifier: { equals: body.organization.taxIdentifier.trim(), mode: 'insensitive' },
            },
          },
        });
        if (existingTaxMatch) {
          return res.status(409).json({
            error: `An organisation with Tax ID "${body.organization.taxIdentifier.trim()}" already exists.`,
            existingPartyId: existingTaxMatch.id,
          });
        }
      }
    }

    let vectorString: string | null = null;
    try {
      const embedding = await generateEmbedding(computedDisplayName);
      if (Array.isArray(embedding) && embedding.length > 0) {
        vectorString = `[${embedding.join(',')}]`;
        if (!body.skipDeduplication) {
          const similarParties: any[] = await (db as any).$queryRaw`
            SELECT id, status 
            FROM parties 
            WHERE tenant_id = ${tenantId} 
            AND embeddings IS NOT NULL
            AND embeddings <=> ${vectorString}::vector < 0.08
            LIMIT 1
          `;
          if (similarParties.length > 0) {
            return res.status(409).json({
              error: 'Semantic match detected. Record may already exist.',
              existingPartyId: similarParties[0].id,
            });
          }
        }
      }
    } catch (vecErr) {
      // Non-fatal if vector extension or AI embedding key is not configured
      console.warn('[POST /people-organisations] Vector deduplication skipped:', (vecErr as Error).message);
    }

    // 2. Default status & Party Code generation
    let status: any = body.status || 'VERIFIED';
    if (body.createdBySwarmId) {
      status = 'PENDING_REVIEW';
    }

    let partyCode = body.partyCode;
    if (!partyCode) {
      const count = await db.party.count({ where: { tenantId } });
      const prefix = body.partyType === 'PERSON' ? 'PER' : 'ORG';
      partyCode = `${prefix}-${String(1001 + count).padStart(4, '0')}`;
    }

    // Resolve primaryOrgName if primaryOrgPartyId is provided
    let primaryOrgName = body.person?.primaryOrgName || null;
    if (body.partyType === 'PERSON' && body.person?.primaryOrgPartyId && !primaryOrgName) {
      const orgParty = await db.party.findUnique({
        where: { id: body.person.primaryOrgPartyId },
        include: { organization: true },
      });
      if (orgParty) {
        primaryOrgName = orgParty.organization?.legalName || orgParty.displayName || null;
      }
    }

    // 3. Create Party and subtype extension
    const newParty = await db.party.create({
      data: {
        tenantId,
        partyType: body.partyType,
        partyCode,
        displayName: computedDisplayName,
        status,
        email: body.email || null,
        secondaryEmail: body.secondaryEmail || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        website: body.website || null,
        avatarUrl: body.avatarUrl || null,
        classifications: body.classifications || [],
        tags: body.tags || [],
        addresses: body.addresses || [],
        socialLinks: body.socialLinks || {},
        preferredContactMethod: body.preferredContactMethod || 'EMAIL',
        timezone: body.timezone || null,
        currency: body.currency || 'AUD',
        accountOwnerMemberId: body.accountOwnerMemberId || null,
        notesSummary: body.notesSummary || null,
        customData: body.customData || {},
        isStarred: body.isStarred || false,
        createdBySwarmId: body.createdBySwarmId || null,
        creationContextLog: body.creationContextLog || null,
        person:
          body.partyType === 'PERSON' && body.person
            ? {
                create: {
                  salutation: body.person.salutation || null,
                  firstName: body.person.firstName,
                  middleName: body.person.middleName || null,
                  lastName: body.person.lastName,
                  preferredName: body.person.preferredName || null,
                  jobTitle: body.person.jobTitle || null,
                  department: body.person.department || null,
                  primaryOrgPartyId: body.person.primaryOrgPartyId || null,
                  primaryOrgName,
                  dateOfBirth: body.person.dateOfBirth ? new Date(body.person.dateOfBirth) : null,
                  isHumanInLoop: body.person.isHumanInLoop || false,
                },
              }
            : undefined,
        organization:
          body.partyType === 'ORGANIZATION' && body.organization
            ? {
                create: {
                  legalName: body.organization.legalName,
                  tradingName: body.organization.tradingName || null,
                  orgStructureType: body.organization.orgStructureType || 'Corporate',
                  incorporationDate: body.organization.incorporationDate
                    ? new Date(body.organization.incorporationDate)
                    : null,
                  taxIdentifier: body.organization.taxIdentifier || null,
                  companyRegistrationNumber: body.organization.companyRegistrationNumber || null,
                  industry: body.organization.industry || null,
                  subIndustry: body.organization.subIndustry || null,
                  companySize: body.organization.companySize || null,
                  annualRevenue: body.organization.annualRevenue || null,
                  billingEmail: body.organization.billingEmail || body.email || null,
                  paymentTerms: body.organization.paymentTerms || 'NET_30',
                  creditLimit:
                    body.organization.creditLimit !== undefined &&
                    body.organization.creditLimit !== null &&
                    body.organization.creditLimit !== ''
                      ? Number(body.organization.creditLimit)
                      : null,
                  primaryContactPartyId: body.organization.primaryContactPartyId || null,
                },
              }
            : undefined,
      },
      include: { person: true, organization: true },
    });

    // If Person has a primaryOrgPartyId, also create an automatic PartyRelationship edge so it shows in the graph!
    if (body.partyType === 'PERSON' && body.person?.primaryOrgPartyId) {
      try {
        await db.partyRelationship.create({
          data: {
            tenantId,
            sourcePartyId: newParty.id,
            targetPartyId: body.person.primaryOrgPartyId,
            relationshipType: 'Employed By',
            roleTitle: body.person.jobTitle || null,
            department: body.person.department || null,
            isPrimary: true,
          },
        });
      } catch {
        // Ignore if relationship creation fails
      }
    }

    if (vectorString) {
      try {
        await (db as any).$executeRaw`
          UPDATE parties 
          SET embeddings = ${vectorString}::vector 
          WHERE id = ${newParty.id}
        `;
      } catch {
        // Non-fatal
      }
    }

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_CREATE',
      resourceId: newParty.id,
      newValue: newParty,
    });

    res.status(201).json(enrichPartyRecord(newParty));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.issues });
    }
    console.error('[POST /people-organisations] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PUT / PATCH Update Person/Organisation
// ============================================================================
const handleUpdateParty = async (req: TenantRequest, res: express.Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const body = PeopleOrgCreateSchema.partial().parse(req.body);

    const existing = await db.party.findUnique({
      where: { id, tenantId },
      include: { person: true, organization: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const nextFirstName = body.person?.firstName ?? existing.person?.firstName ?? '';
    const nextLastName = body.person?.lastName ?? existing.person?.lastName ?? '';
    const nextLegalName = body.organization?.legalName ?? existing.organization?.legalName ?? '';

    const computedDisplayName =
      body.displayName !== undefined
        ? body.displayName
        : existing.partyType === 'PERSON'
        ? `${nextFirstName} ${nextLastName}`.trim()
        : nextLegalName || existing.displayName;

    // Resolve primaryOrgName if primaryOrgPartyId changed
    let primaryOrgName =
      body.person?.primaryOrgName !== undefined
        ? body.person.primaryOrgName
        : existing.person?.primaryOrgName;
    if (
      existing.partyType === 'PERSON' &&
      body.person?.primaryOrgPartyId &&
      body.person.primaryOrgPartyId !== existing.person?.primaryOrgPartyId
    ) {
      const orgParty = await db.party.findUnique({
        where: { id: body.person.primaryOrgPartyId },
        include: { organization: true },
      });
      if (orgParty) {
        primaryOrgName = orgParty.organization?.legalName || orgParty.displayName || null;
      }
    } else if (body.person?.primaryOrgPartyId === null || body.person?.primaryOrgPartyId === '') {
      primaryOrgName = null;
    }

    const updated = await db.party.update({
      where: { id },
      data: {
        status: body.status ?? existing.status,
        partyCode: body.partyCode !== undefined ? body.partyCode : existing.partyCode,
        displayName: computedDisplayName,
        email: body.email !== undefined ? body.email : existing.email,
        secondaryEmail: body.secondaryEmail !== undefined ? body.secondaryEmail : existing.secondaryEmail,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        mobile: body.mobile !== undefined ? body.mobile : existing.mobile,
        website: body.website !== undefined ? body.website : existing.website,
        avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl,
        classifications: body.classifications !== undefined ? body.classifications : existing.classifications,
        tags: body.tags !== undefined ? body.tags : existing.tags,
        addresses: body.addresses !== undefined ? body.addresses : existing.addresses,
        socialLinks: body.socialLinks !== undefined ? body.socialLinks : existing.socialLinks,
        preferredContactMethod:
          body.preferredContactMethod !== undefined
            ? body.preferredContactMethod
            : existing.preferredContactMethod,
        timezone: body.timezone !== undefined ? body.timezone : existing.timezone,
        currency: body.currency !== undefined ? body.currency : existing.currency,
        accountOwnerMemberId:
          body.accountOwnerMemberId !== undefined ? body.accountOwnerMemberId : existing.accountOwnerMemberId,
        notesSummary: body.notesSummary !== undefined ? body.notesSummary : existing.notesSummary,
        customData:
          body.customData !== undefined
            ? { ...((existing.customData as Record<string, any>) || {}), ...(body.customData || {}) }
            : existing.customData,
        isStarred: body.isStarred !== undefined ? body.isStarred : existing.isStarred,
        person:
          existing.partyType === 'PERSON' && body.person
            ? {
                update: {
                  salutation:
                    body.person.salutation !== undefined ? body.person.salutation : existing.person?.salutation,
                  firstName: body.person.firstName ?? existing.person?.firstName,
                  middleName:
                    body.person.middleName !== undefined ? body.person.middleName : existing.person?.middleName,
                  lastName: body.person.lastName ?? existing.person?.lastName,
                  preferredName:
                    body.person.preferredName !== undefined
                      ? body.person.preferredName
                      : existing.person?.preferredName,
                  jobTitle: body.person.jobTitle !== undefined ? body.person.jobTitle : existing.person?.jobTitle,
                  department:
                    body.person.department !== undefined ? body.person.department : existing.person?.department,
                  primaryOrgPartyId:
                    body.person.primaryOrgPartyId !== undefined
                      ? body.person.primaryOrgPartyId || null
                      : existing.person?.primaryOrgPartyId,
                  primaryOrgName,
                  dateOfBirth:
                    body.person.dateOfBirth !== undefined
                      ? body.person.dateOfBirth
                        ? new Date(body.person.dateOfBirth)
                        : null
                      : existing.person?.dateOfBirth,
                  isHumanInLoop:
                    body.person.isHumanInLoop !== undefined
                      ? body.person.isHumanInLoop
                      : existing.person?.isHumanInLoop,
                },
              }
            : undefined,
        organization:
          existing.partyType === 'ORGANIZATION' && body.organization
            ? {
                update: {
                  legalName: body.organization.legalName ?? existing.organization?.legalName,
                  tradingName:
                    body.organization.tradingName !== undefined
                      ? body.organization.tradingName
                      : existing.organization?.tradingName,
                  orgStructureType:
                    body.organization.orgStructureType ?? existing.organization?.orgStructureType,
                  incorporationDate:
                    body.organization.incorporationDate !== undefined
                      ? body.organization.incorporationDate
                        ? new Date(body.organization.incorporationDate)
                        : null
                      : existing.organization?.incorporationDate,
                  taxIdentifier:
                    body.organization.taxIdentifier !== undefined
                      ? body.organization.taxIdentifier
                      : existing.organization?.taxIdentifier,
                  companyRegistrationNumber:
                    body.organization.companyRegistrationNumber !== undefined
                      ? body.organization.companyRegistrationNumber
                      : existing.organization?.companyRegistrationNumber,
                  industry:
                    body.organization.industry !== undefined
                      ? body.organization.industry
                      : existing.organization?.industry,
                  subIndustry:
                    body.organization.subIndustry !== undefined
                      ? body.organization.subIndustry
                      : existing.organization?.subIndustry,
                  companySize:
                    body.organization.companySize !== undefined
                      ? body.organization.companySize
                      : existing.organization?.companySize,
                  annualRevenue:
                    body.organization.annualRevenue !== undefined
                      ? body.organization.annualRevenue
                      : existing.organization?.annualRevenue,
                  billingEmail:
                    body.organization.billingEmail !== undefined
                      ? body.organization.billingEmail
                      : existing.organization?.billingEmail,
                  paymentTerms:
                    body.organization.paymentTerms !== undefined
                      ? body.organization.paymentTerms
                      : existing.organization?.paymentTerms,
                  creditLimit:
                    body.organization.creditLimit !== undefined
                      ? body.organization.creditLimit !== null && body.organization.creditLimit !== ''
                        ? Number(body.organization.creditLimit)
                        : null
                      : existing.organization?.creditLimit,
                  primaryContactPartyId:
                    body.organization.primaryContactPartyId !== undefined
                      ? body.organization.primaryContactPartyId || null
                      : existing.organization?.primaryContactPartyId,
                },
              }
            : undefined,
      },
      include: { person: true, organization: true },
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_UPDATE',
      resourceId: id,
      oldValue: existing,
      newValue: updated,
    });

    res.json(enrichPartyRecord(updated));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.issues });
    }
    console.error('[PUT /people-organisations/:id] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

router.put('/:id', handleUpdateParty);
router.patch('/:id', handleUpdateParty);

// ============================================================================
// PATCH Approve Person/Organisation
// ============================================================================
router.patch('/:id/approve', authorize('manage:people-organisations'), async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    const updated = await db.party.update({
      where: { id, tenantId: req.tenantId },
      data: { status: 'VERIFIED' },
      include: { person: true, organization: true },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_APPROVE',
      resourceId: id,
      newValue: updated,
    });

    res.json(enrichPartyRecord(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POST Transactional Entity Merge (Master Survivorship & Re-linking)
// ============================================================================
router.post('/:id/merge', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const masterId = req.params.id;
    const { sourcePartyId, duplicatePartyIds } = req.body;

    const dupIds: string[] = Array.isArray(duplicatePartyIds)
      ? duplicatePartyIds.filter((id: string) => id && id !== masterId)
      : sourcePartyId && sourcePartyId !== masterId
      ? [sourcePartyId]
      : [];

    if (dupIds.length === 0) {
      return res.status(400).json({ error: 'At least one distinct duplicate partyId is required to merge.' });
    }

    const updatedMaster = await DedupeService.mergeEntities(
      tenantId,
      masterId,
      dupIds,
      req.user?.uid || 'USER'
    );

    res.json({
      merged: true,
      masterParty: enrichPartyRecord(updatedMaster),
      deletedPartyIds: dupIds,
    });
  } catch (err: any) {
    console.error('[POST /people-organisations/:id/merge] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// DELETE Person/Organisation
// ============================================================================
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    await db.party.delete({
      where: { id, tenantId: req.tenantId },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_DELETE',
      resourceId: id,
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Relationships API (GET, POST, PATCH, DELETE)
// ============================================================================
router.get('/:id/relationships', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    const relationships = await db.partyRelationship.findMany({
      where: {
        tenantId: req.tenantId,
        OR: [{ sourcePartyId: id }, { targetPartyId: id }],
      },
      include: {
        sourceParty: { include: { person: true, organization: true } },
        targetParty: { include: { person: true, organization: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
    });

    res.json(
      relationships.map((r) => ({
        ...r,
        sourceParty: enrichPartyRecord(r.sourceParty),
        targetParty: enrichPartyRecord(r.targetParty),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const RelationshipCreateSchema = z.object({
  targetPartyId: z.string(),
  relationshipType: z.string(),
  roleTitle: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
  ownershipPercentage: z.number().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
});

router.post('/:id/relationships', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id: sourcePartyId } = req.params;
    const body = RelationshipCreateSchema.parse(req.body);

    const relationship = await db.partyRelationship.create({
      data: {
        tenantId,
        sourcePartyId,
        targetPartyId: body.targetPartyId,
        relationshipType: body.relationshipType,
        roleTitle: body.roleTitle || null,
        department: body.department || null,
        isPrimary: body.isPrimary || false,
        notes: body.notes || null,
        ownershipPercentage: body.ownershipPercentage ?? null,
        validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
        validTo: body.validTo ? new Date(body.validTo) : null,
      },
      include: {
        sourceParty: { include: { person: true, organization: true } },
        targetParty: { include: { person: true, organization: true } },
      },
    });

    // Auto-sync primaryOrgPartyId / primaryContactPartyId when relationship connects a Person and an Organization
    const src = relationship.sourceParty;
    const tgt = relationship.targetParty;
    if (src.partyType === 'PERSON' && tgt.partyType === 'ORGANIZATION') {
      if (body.isPrimary || !src.person?.primaryOrgPartyId) {
        await db.person.update({
          where: { partyId: src.id },
          data: {
            primaryOrgPartyId: tgt.id,
            primaryOrgName: tgt.organization?.legalName || tgt.displayName,
            ...(body.roleTitle && !src.person?.jobTitle ? { jobTitle: body.roleTitle } : {}),
          },
        });
      }
      if (body.isPrimary || !tgt.organization?.primaryContactPartyId) {
        await db.organization.update({
          where: { partyId: tgt.id },
          data: { primaryContactPartyId: src.id },
        });
      }
    } else if (src.partyType === 'ORGANIZATION' && tgt.partyType === 'PERSON') {
      if (body.isPrimary || !tgt.person?.primaryOrgPartyId) {
        await db.person.update({
          where: { partyId: tgt.id },
          data: {
            primaryOrgPartyId: src.id,
            primaryOrgName: src.organization?.legalName || src.displayName,
            ...(body.roleTitle && !tgt.person?.jobTitle ? { jobTitle: body.roleTitle } : {}),
          },
        });
      }
      if (body.isPrimary || !src.organization?.primaryContactPartyId) {
        await db.organization.update({
          where: { partyId: src.id },
          data: { primaryContactPartyId: tgt.id },
        });
      }
    }

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'CREATE_RELATIONSHIP',
      resourceId: relationship.id,
      newValue: {
        sourcePartyId,
        targetPartyId: body.targetPartyId,
        relationshipType: body.relationshipType,
        roleTitle: body.roleTitle,
      },
    });

    res.status(201).json({
      ...relationship,
      sourceParty: enrichPartyRecord(relationship.sourceParty),
      targetParty: enrichPartyRecord(relationship.targetParty),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/relationships/:relId', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { relId } = req.params;
    const body = RelationshipCreateSchema.partial().parse(req.body);

    const updated = await db.partyRelationship.update({
      where: { id: relId, tenantId },
      data: {
        ...(body.relationshipType !== undefined ? { relationshipType: body.relationshipType } : {}),
        ...(body.roleTitle !== undefined ? { roleTitle: body.roleTitle } : {}),
        ...(body.department !== undefined ? { department: body.department } : {}),
        ...(body.isPrimary !== undefined ? { isPrimary: body.isPrimary } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.ownershipPercentage !== undefined ? { ownershipPercentage: body.ownershipPercentage } : {}),
        ...(body.validFrom !== undefined
          ? { validFrom: body.validFrom ? new Date(body.validFrom) : new Date() }
          : {}),
        ...(body.validTo !== undefined ? { validTo: body.validTo ? new Date(body.validTo) : null } : {}),
      },
      include: {
        sourceParty: { include: { person: true, organization: true } },
        targetParty: { include: { person: true, organization: true } },
      },
    });

    res.json({
      ...updated,
      sourceParty: enrichPartyRecord(updated.sourceParty),
      targetParty: enrichPartyRecord(updated.targetParty),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/relationships/:relId', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { relId } = req.params;

    await db.partyRelationship.delete({
      where: { id: relId, tenantId },
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'DELETE_RELATIONSHIP',
      resourceId: relId,
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

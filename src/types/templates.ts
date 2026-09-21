/**
 * Universal Template Architecture Types for Aurora
 * Supports thousands of templates across all platform builders.
 */

export type BuilderType = 
  | 'MODULE'
  | 'FORM'
  | 'AGENT'
  | 'WORKFLOW'
  | 'SOLUTION'
  | 'KPI'
  | 'DOCUMENT'
  | 'REPORT'
  | 'SITE'
  | 'BRAND'
  | 'QUEUE'
  | 'CONNECTOR';

export type TemplateIndustry =
  | 'Cross-Industry'
  | 'Healthcare & Life Sciences'
  | 'Financial Services & Fintech'
  | 'Real Estate & Property'
  | 'Legal & Compliance'
  | 'E-Commerce & Retail'
  | 'SaaS & Technology'
  | 'Manufacturing & Logistics'
  | 'Non-Profit & Public Sector'
  | 'Professional Services'
  | 'Human Resources & Talent'
  | 'Customer Operations';

export interface UniversalTemplateMetadata {
  id: string;
  slug: string;
  builderType: BuilderType;
  name: string;
  description: string;
  industry: TemplateIndustry | string;
  category: string;
  department?: string;
  tags: string[];
  icon?: string;
  thumbnailUrl?: string;
  version: string;
  isSystem: boolean;
  tenantId?: string | null;
  popularityScore?: number;
  complexity?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Enterprise';
  estimatedSetupMinutes?: number;
  author?: {
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  dependencies?: {
    requiredModules?: string[];
    requiredConnectors?: string[];
    minAuroraVersion?: string;
  };
  payload?: any;
  schemaPayload?: any;
}

/**
 * Full Universal Template Envelope (Metadata + Deep Payload)
 */
export interface UniversalTemplateEnvelope<TPayload = any> extends UniversalTemplateMetadata {
  payload: TPayload;
  sampleData?: Record<string, any>;
  changeLog?: { version: string; date: string; summary: string }[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filter and query params for fetching templates
 */
export interface TemplateQueryParams {
  builderType?: BuilderType | string;
  industry?: string;
  category?: string;
  search?: string;
  tags?: string[];
  isSystemOnly?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'popularity' | 'name' | 'newest';
  includePayload?: boolean;
}

/**
 * Template Catalog Query Response
 */
export interface TemplateCatalogResponse {
  templates: UniversalTemplateMetadata[];
  total: number;
  facets: {
    industries: { name: string; count: number }[];
    categories: { name: string; count: number }[];
    builderTypes: { type: BuilderType; count: number }[];
  };
}

/**
 * Solution Composite Template Reference Definition
 */
export interface SolutionBundleTemplatePayload {
  summary: string;
  architectureNotes?: string;
  childTemplates: {
    moduleTemplateIds?: string[];
    formTemplateIds?: string[];
    agentTemplateIds?: string[];
    workflowTemplateIds?: string[];
    kpiTemplateIds?: string[];
    documentTemplateIds?: string[];
    siteTemplateIds?: string[];
    brandTemplateIds?: string[];
  };
  wiring: {
    sourceId: string;
    targetId: string;
    relationshipType: string;
  }[];
}

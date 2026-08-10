export interface SiteBranding {
  accentColor: string;
  logoUrl?: string;
  headerTitle: string;
  footerText: string;
  themeMode?: 'dark' | 'light' | 'system';
  headerLayout?: 'top_right' | 'top_center' | 'pill_header' | 'minimal';
  fontFamily?: 'sans' | 'outfit' | 'mono' | 'serif';
}

export interface SiteNavItem {
  id: string;
  label: string;
  path: string;
}

export interface SiteWidget {
  id: string;
  type: 'hero' | 'announcements' | 'ticket_form' | 'kb_search' | 'status_widget' | 'form_embed' | 'module_feed';
  enabled: boolean;
  title: string;
  subtitle?: string;
  targetModuleId?: string;
  targetModuleName?: string;
}

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  isHome?: boolean;
  parentId?: string | null;
  widgets: SiteWidget[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}


export interface SiteSeoConfig {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
}

export interface SiteTypographyConfig {
  fontFamily?: 'sans' | 'outfit' | 'mono' | 'serif' | 'playfair';
  borderRadius?: 'none' | 'md' | 'xl' | 'full';
  fontScale?: 'normal' | 'compact' | 'large';
}

export interface SiteCustomCode {
  headScripts?: string;
  bodyScripts?: string;
  customCss?: string;
}

export interface SiteLocalizationConfig {
  defaultLanguage?: string;
  supportedLanguages?: string[];
  autoTranslate?: boolean;
}

export interface SiteSubmission {
  id: string;
  formName: string;
  submittedAt: string;
  data: Record<string, any>;
}

export interface Site {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  category: 'internal' | 'external' | 'public';
  type: string;
  domain: string;
  status: 'active' | 'draft' | 'offline';
  access: 'Public' | 'Authenticated' | 'Restricted' | 'Admin Only';
  branding?: SiteBranding;
  navConfig?: SiteNavItem[];
  pagesConfig?: any;
  pages?: SitePage[];
  seoConfig?: SiteSeoConfig;
  typographyConfig?: SiteTypographyConfig;
  customCode?: SiteCustomCode;
  localizationConfig?: SiteLocalizationConfig;
  submissions?: SiteSubmission[];
  metrics?: {
    metricLabel: string;
    metricValue: string;
  };
  createdAt?: string;
  updatedAt?: string;
}


const getApiBaseUrl = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001/api' 
    : '/api';
};

const getHeaders = () => {
  const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId
  };
};

export const SiteService = {
  async getSites(category: string = 'all', status: string = 'all'): Promise<Site[]> {
    const url = new URL(`${getApiBaseUrl()}/sites`);
    if (category && category !== 'all') url.searchParams.append('category', category);
    if (status && status !== 'all') url.searchParams.append('status', status);

    const res = await fetch(url.toString(), {
      headers: getHeaders()
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch sites: ${res.statusText}`);
    }

    return await res.json();
  },

  async getSiteById(id: string): Promise<Site> {
    const res = await fetch(`${getApiBaseUrl()}/sites/${id}`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch site details: ${res.statusText}`);
    }

    return await res.json();
  },

  async getPublicSite(idOrDomain: string): Promise<Site> {
    const res = await fetch(`${getApiBaseUrl()}/public/sites/${idOrDomain}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch public site configuration: ${res.statusText}`);
    }
    return await res.json();
  },

  async createSite(siteData: Partial<Site>): Promise<Site> {
    const res = await fetch(`${getApiBaseUrl()}/sites`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(siteData)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to create site: ${res.statusText}`);
    }

    return await res.json();
  },

  async updateSite(id: string, siteData: Partial<Site>): Promise<Site> {
    const res = await fetch(`${getApiBaseUrl()}/sites/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(siteData)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to update site: ${res.statusText}`);
    }

    return await res.json();
  },

  async toggleSiteStatus(id: string, currentStatus: 'active' | 'draft' | 'offline'): Promise<Site> {
    const statusCycle: ('active' | 'draft' | 'offline')[] = ['active', 'draft', 'offline'];
    const nextIndex = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    const res = await fetch(`${getApiBaseUrl()}/sites/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) {
      throw new Error(`Failed to toggle site status: ${res.statusText}`);
    }

    return await res.json();
  },

  async deleteSite(id: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/sites/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) {
      throw new Error(`Failed to delete site: ${res.statusText}`);
    }
  }
};

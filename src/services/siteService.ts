export interface EnterpriseFont {
  id: string;
  name: string;
  category: 'Sans-Serif' | 'Serif' | 'Monospace';
  fontFamilyCss: string;
  sampleText?: string;
}

export const ENTERPRISE_FONTS: EnterpriseFont[] = [
  // Sans-Serif Modern & Corporate
  { id: 'sans', name: 'Inter Corporate UI', category: 'Sans-Serif', fontFamilyCss: "'Inter', sans-serif" },
  { id: 'plus_jakarta', name: 'Plus Jakarta Sans', category: 'Sans-Serif', fontFamilyCss: "'Plus Jakarta Sans', sans-serif" },
  { id: 'outfit', name: 'Outfit Geometric', category: 'Sans-Serif', fontFamilyCss: "'Outfit', sans-serif" },
  { id: 'poppins', name: 'Poppins Friendly', category: 'Sans-Serif', fontFamilyCss: "'Poppins', sans-serif" },
  { id: 'montserrat', name: 'Montserrat Executive', category: 'Sans-Serif', fontFamilyCss: "'Montserrat', sans-serif" },
  { id: 'dm_sans', name: 'DM Sans Minimal', category: 'Sans-Serif', fontFamilyCss: "'DM Sans', sans-serif" },
  { id: 'roboto', name: 'Roboto Technical', category: 'Sans-Serif', fontFamilyCss: "'Roboto', sans-serif" },
  { id: 'space_grotesk', name: 'Space Grotesk Tech', category: 'Sans-Serif', fontFamilyCss: "'Space Grotesk', sans-serif" },

  // Serif & Luxury Editorial
  { id: 'playfair', name: 'Playfair Editorial', category: 'Serif', fontFamilyCss: "'Playfair Display', serif" },
  { id: 'merriweather', name: 'Merriweather Corporate', category: 'Serif', fontFamilyCss: "'Merriweather', serif" },
  { id: 'lora', name: 'Lora Refined', category: 'Serif', fontFamilyCss: "'Lora', serif" },
  { id: 'cinzel', name: 'Cinzel Premium Luxury', category: 'Serif', fontFamilyCss: "'Cinzel', serif" },

  // Monospace & Developer Tech
  { id: 'mono', name: 'JetBrains Mono IDE', category: 'Monospace', fontFamilyCss: "'JetBrains Mono', monospace" },
  { id: 'fira_code', name: 'Fira Code Developer', category: 'Monospace', fontFamilyCss: "'Fira Code', monospace" },
  { id: 'space_mono', name: 'Space Data Mono', category: 'Monospace', fontFamilyCss: "'Space Mono', monospace" }
];

export interface SiteThemeConfig {
  activeThemeId?: string;
  accentColor: string;
  bgMode: 'dark_obsidian' | 'light_clean' | 'synthwave_neon' | 'emerald_eco' | 'midnight_luxury';
  cardStyle: 'solid' | 'glass' | 'bordered' | 'gradient';
  borderRadius: 'none' | 'md' | 'xl' | '2xl' | 'full';
  fontFamily: string;
  headerLayout: 'top_right' | 'top_center' | 'pill_header' | 'minimal';
  navLinkStyle?: 'underline' | 'pills' | 'badges' | 'glowing_text' | 'ghost_button';
  customCss?: string;
}

export interface PresetTheme {
  id: string;
  name: string;
  description: string;
  badge?: string;
  previewGradient: string;
  accentColor: string;
  bgMode: 'dark_obsidian' | 'light_clean' | 'synthwave_neon' | 'emerald_eco' | 'midnight_luxury';
  cardStyle: 'solid' | 'glass' | 'bordered' | 'gradient';
  borderRadius: 'none' | 'md' | 'xl' | '2xl' | 'full';
  fontFamily: string;
  headerLayout: 'top_right' | 'top_center' | 'pill_header' | 'minimal';
  navLinkStyle?: 'underline' | 'pills' | 'badges' | 'glowing_text' | 'ghost_button';
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'cyber_dark',
    name: 'Aurora Cyber Dark',
    description: 'High-contrast dark mode with glowing indigo accents and glassmorphic card surfaces.',
    badge: 'Popular',
    previewGradient: 'from-indigo-600 via-purple-600 to-pink-500',
    accentColor: '#6366f1',
    bgMode: 'dark_obsidian',
    cardStyle: 'glass',
    borderRadius: '2xl',
    fontFamily: 'sans',
    headerLayout: 'top_right',
    navLinkStyle: 'pills'
  },
  {
    id: 'clean_light',
    name: 'Enterprise Clean Light',
    description: 'Crisp light mode with sapphire blue accents and clean structural borders.',
    badge: 'Enterprise',
    previewGradient: 'from-blue-500 via-cyan-500 to-teal-400',
    accentColor: '#2563eb',
    bgMode: 'light_clean',
    cardStyle: 'bordered',
    borderRadius: 'xl',
    fontFamily: 'outfit',
    headerLayout: 'top_right',
    navLinkStyle: 'underline'
  },
  {
    id: 'synthwave_neon',
    name: 'Synthwave Sunset',
    description: 'Vibrant neon gradient accents with deep obsidian dark backgrounds.',
    badge: 'Vibrant',
    previewGradient: 'from-pink-500 via-rose-500 to-amber-500',
    accentColor: '#ec4899',
    bgMode: 'synthwave_neon',
    cardStyle: 'gradient',
    borderRadius: '2xl',
    fontFamily: 'mono',
    headerLayout: 'pill_header',
    navLinkStyle: 'glowing_text'
  },
  {
    id: 'emerald_eco',
    name: 'Emerald Eco Hub',
    description: 'Organic dark emerald theme with pill badging and soft ambient lighting.',
    badge: 'Organic',
    previewGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    accentColor: '#10b981',
    bgMode: 'emerald_eco',
    cardStyle: 'glass',
    borderRadius: 'full',
    fontFamily: 'sans',
    headerLayout: 'top_center',
    navLinkStyle: 'badges'
  },
  {
    id: 'midnight_luxury',
    name: 'Midnight Gold Luxury',
    description: 'Premium pure black background with sharp metallic gold accents and minimal geometry.',
    badge: 'Premium',
    previewGradient: 'from-amber-400 via-yellow-500 to-amber-600',
    accentColor: '#f59e0b',
    bgMode: 'midnight_luxury',
    cardStyle: 'solid',
    borderRadius: 'none',
    fontFamily: 'playfair',
    headerLayout: 'minimal',
    navLinkStyle: 'ghost_button'
  }
];

export interface SiteBranding {
  accentColor: string;
  logoUrl?: string;
  headerTitle: string;
  footerText: string;
  themeMode?: 'dark' | 'light' | 'system';
  headerLayout?: 'top_right' | 'top_center' | 'pill_header' | 'minimal';
  fontFamily?: 'sans' | 'outfit' | 'mono' | 'serif' | 'playfair';
  navLinkStyle?: 'underline' | 'pills' | 'badges' | 'glowing_text' | 'ghost_button';
  themeConfig?: SiteThemeConfig;
}

export interface SiteNavItem {
  id: string;
  label: string;
  path: string;
}

export interface FormFieldConfig {
  id: string;
  label: string;
  fieldType: 'text' | 'email' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface SiteWidget {
  id: string;
  type: 'hero' | 'announcements' | 'ticket_form' | 'kb_search' | 'status_widget' | 'form_embed' | 'module_feed';
  enabled: boolean;
  title: string;
  subtitle?: string;
  targetModuleId?: string;
  targetModuleName?: string;
  formFields?: FormFieldConfig[];
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
  fontFamily?: string;
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

import { API_BASE_URL } from '../config';

export interface BrandAssets {
  logoLight?: string;
  logoDark?: string;
  iconMark?: string;
  favicon?: string;
  letterheadBanner?: string;
  socialOgImage?: string;
  watermark?: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  chartPalette: string[];
}

export interface BrandTypography {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  fontSizeScale: 'compact' | 'medium' | 'spacious';
}

export interface BrandStyling {
  borderRadius: string; // e.g. '8px', '12px', '16px', '24px'
  buttonStyle: 'rounded' | 'pill' | 'square';
  elevation: 'flat' | 'subtle' | 'elevated';
  headerLayout?: 'top_right' | 'centered' | 'minimal' | 'full_banner';
  navLinkStyle?: 'underline' | 'pill' | 'glow' | 'minimal';
}

export interface BrandVoiceAndTone {
  tone?: string;
  boilerplate?: string;
  tagline?: string;
  prohibitedWords?: string[];
  audiencePersona?: string;
  guidelines?: string;
}

export interface BrandEmailDefaults {
  signatureTemplate?: string;
  disclaimer?: string;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface BrandKit {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  isDefault: boolean;
  assets: BrandAssets;
  colors: BrandColors;
  typography: BrandTypography;
  styling: BrandStyling;
  voiceAndTone: BrandVoiceAndTone;
  emailDefaults: BrandEmailDefaults;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sites: number;
  };
  sites?: Array<{ id: string; name: string; domain: string; status: string }>;
}

export interface AIPaletteSuggestion {
  colors: BrandColors;
  typography: BrandTypography;
  styling: BrandStyling;
  voiceAndTone: BrandVoiceAndTone;
}

export class BrandKitService {
  private static getHeaders(token?: string, tenantId?: string) {
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {})
    };
  }

  static async getBrandKits(token?: string, tenantId?: string): Promise<BrandKit[]> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits`, {
      headers: this.getHeaders(token, tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch brand kits');
    }
    return res.json();
  }

  static async getBrandKit(id: string, token?: string, tenantId?: string): Promise<BrandKit> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits/${id}`, {
      headers: this.getHeaders(token, tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch brand kit');
    }
    return res.json();
  }

  static async createBrandKit(
    data: Partial<BrandKit>,
    token?: string,
    tenantId?: string
  ): Promise<BrandKit> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create brand kit');
    }
    return res.json();
  }

  static async updateBrandKit(
    id: string,
    data: Partial<BrandKit>,
    token?: string,
    tenantId?: string
  ): Promise<BrandKit> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update brand kit');
    }
    return res.json();
  }

  static async setDefaultBrandKit(id: string, token?: string, tenantId?: string): Promise<BrandKit> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits/${id}/set-default`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set default brand kit');
    }
    return res.json();
  }

  static async deleteBrandKit(id: string, token?: string, tenantId?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token, tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete brand kit');
    }
    return res.json();
  }

  static async generateAIPalette(
    params: { prompt?: string; industry?: string; brandName?: string },
    token?: string,
    tenantId?: string
  ): Promise<AIPaletteSuggestion> {
    const res = await fetch(`${API_BASE_URL}/api/brand-kits/generate-palette`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate AI palette');
    }
    return res.json();
  }
}

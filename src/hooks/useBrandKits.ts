import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { usePlatform } from './usePlatform';
import { BrandKit, BrandKitService, AIPaletteSuggestion } from '../services/brandKitService';
import { toast } from 'sonner';

export function useBrandKits() {
  const { session } = useAuth();
  const { tenant } = usePlatform();
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrandKits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BrandKitService.getBrandKits(session?.access_token, tenant?.id);
      setBrandKits(data);
    } catch (err: any) {
      console.error('[useBrandKits] fetch error:', err);
      setError(err.message || 'Failed to load brand kits');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, tenant?.id]);

  useEffect(() => {
    fetchBrandKits();
  }, [fetchBrandKits]);

  const defaultBrandKit = useMemo(() => {
    return brandKits.find(b => b.isDefault) || brandKits[0] || null;
  }, [brandKits]);

  const createBrandKit = async (data: Partial<BrandKit>): Promise<BrandKit> => {
    try {
      const created = await BrandKitService.createBrandKit(data, session?.access_token, tenant?.id);
      toast.success(`Brand Kit "${created.name}" created successfully`);
      await fetchBrandKits();
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create brand kit');
      throw err;
    }
  };

  const updateBrandKit = async (id: string, data: Partial<BrandKit>): Promise<BrandKit> => {
    try {
      const updated = await BrandKitService.updateBrandKit(id, data, session?.access_token, tenant?.id);
      toast.success('Brand Kit updated');
      await fetchBrandKits();
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update brand kit');
      throw err;
    }
  };

  const setDefaultBrandKit = async (id: string): Promise<void> => {
    try {
      await BrandKitService.setDefaultBrandKit(id, session?.access_token, tenant?.id);
      toast.success('Default brand kit updated');
      await fetchBrandKits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default brand kit');
      throw err;
    }
  };

  const deleteBrandKit = async (id: string): Promise<void> => {
    try {
      await BrandKitService.deleteBrandKit(id, session?.access_token, tenant?.id);
      toast.success('Brand kit removed');
      await fetchBrandKits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete brand kit');
      throw err;
    }
  };

  const generateAIPalette = async (params: { prompt?: string; industry?: string; brandName?: string }): Promise<AIPaletteSuggestion> => {
    try {
      return await BrandKitService.generateAIPalette(params, session?.access_token, tenant?.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate AI palette');
      throw err;
    }
  };

  /**
   * Helper to resolve CSS variables and theme tokens from a given brandId or kit,
   * falling back to the default brand kit or tenant configuration.
   */
  const resolveBrandTokens = useCallback((brandIdOrKit?: string | BrandKit | null) => {
    let brand: BrandKit | null = null;
    if (typeof brandIdOrKit === 'string') {
      brand = brandKits.find(b => b.id === brandIdOrKit) || defaultBrandKit;
    } else if (brandIdOrKit && typeof brandIdOrKit === 'object') {
      brand = brandIdOrKit;
    } else {
      brand = defaultBrandKit;
    }

    const colors = brand?.colors || {
      primary: (tenant?.branding as any)?.primaryColor || '#4f46e5',
      secondary: '#0ea5e9',
      accent: (tenant?.branding as any)?.accentColor || '#6366f1',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
      chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    };

    const assets = brand?.assets || {
      logoLight: (tenant?.branding as any)?.logoUrl || '',
      logoDark: (tenant?.branding as any)?.logoDarkUrl || (tenant?.branding as any)?.logoUrl || '',
      favicon: (tenant?.branding as any)?.faviconUrl || ''
    };

    const typography = brand?.typography || {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      fontSizeScale: 'medium'
    };

    const styling = brand?.styling || {
      borderRadius: '12px',
      buttonStyle: 'rounded',
      elevation: 'subtle'
    };

    return {
      brand,
      brandName: brand?.name || tenant?.name || 'Aurora Brand',
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      chartPalette: colors.chartPalette || ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      logoLight: assets.logoLight,
      logoDark: assets.logoDark,
      favicon: assets.favicon,
      headingFont: typography.headingFont,
      bodyFont: typography.bodyFont,
      borderRadius: styling.borderRadius,
      cssVariables: {
        '--brand-primary': colors.primary,
        '--brand-secondary': colors.secondary,
        '--brand-accent': colors.accent,
        '--brand-heading-font': typography.headingFont,
        '--brand-body-font': typography.bodyFont,
        '--brand-radius': styling.borderRadius
      } as React.CSSProperties
    };
  }, [brandKits, defaultBrandKit, tenant]);

  return {
    brandKits,
    defaultBrandKit,
    loading,
    error,
    refetch: fetchBrandKits,
    createBrandKit,
    updateBrandKit,
    setDefaultBrandKit,
    deleteBrandKit,
    generateAIPalette,
    resolveBrandTokens
  };
}

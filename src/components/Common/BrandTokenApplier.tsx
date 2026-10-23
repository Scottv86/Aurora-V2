import React, { useEffect } from 'react';
import { useBrandKits } from '../../hooks/useBrandKits';

/**
 * Injects CSS custom properties from the active Brand Kit into document.documentElement,
 * cascading design tokens (primary, secondary, accent colors, radii, and fonts) across the entire platform.
 */
export const BrandTokenApplier: React.FC = () => {
  const { defaultBrandKit, resolveBrandTokens } = useBrandKits();

  useEffect(() => {
    const tokens = resolveBrandTokens(defaultBrandKit);
    const root = document.documentElement;

    if (tokens.primaryColor) root.style.setProperty('--brand-primary', tokens.primaryColor);
    if (tokens.secondaryColor) root.style.setProperty('--brand-secondary', tokens.secondaryColor);
    if (tokens.accentColor) root.style.setProperty('--brand-accent', tokens.accentColor);
    if (tokens.borderRadius) root.style.setProperty('--brand-radius', tokens.borderRadius);
    if (tokens.headingFont) root.style.setProperty('--brand-font-heading', tokens.headingFont);
    if (tokens.bodyFont) root.style.setProperty('--brand-font-body', tokens.bodyFont);

    if (tokens.chartPalette && Array.isArray(tokens.chartPalette)) {
      tokens.chartPalette.forEach((color, i) => {
        root.style.setProperty(`--brand-chart-${i + 1}`, color);
      });
    }

    // Dynamic Google Fonts stylesheet link
    if (tokens.headingFont || tokens.bodyFont) {
      const fontsToLoad = Array.from(new Set([tokens.headingFont, tokens.bodyFont].filter(Boolean)));
      const fontQuery = fontsToLoad.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&');
      let linkEl = document.getElementById('aurora-brand-fonts') as HTMLLinkElement | null;
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = 'aurora-brand-fonts';
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
      }
      linkEl.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    }
  }, [defaultBrandKit, resolveBrandTokens]);

  return null;
};

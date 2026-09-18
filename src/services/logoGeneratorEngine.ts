/**
 * Procedural Vector Logo & Mark Generator Engine
 * Generates resolution-independent SVG marks, monograms, and wordmarks
 * in both Light (dark text for white surfaces) and Dark (light text for dark surfaces) formats.
 */

export type LogoMarkType = 
  | 'hexagon_shield'
  | 'orbital_helix'
  | 'prism_cube'
  | 'wave_pulse'
  | 'infinity_loop'
  | 'stacked_layers'
  | 'diamond_apex'
  | 'constellation'
  | 'bio_leaf'
  | 'cyber_spark'
  | 'quantum_core'
  | 'dynamic_wings'
  | 'monogram_circle'
  | 'monogram_shield'
  | 'monogram_squircle';

export type LogoLayout = 'horizontal' | 'vertical' | 'mark_only' | 'wordmark_only';

export interface LogoGeneratorConfig {
  brandName: string;
  tagline?: string;
  markType: LogoMarkType;
  layout: LogoLayout;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontFamily?: string;
  letterSpacing?: number;
  monogramLetters?: string;
  strokeWidth?: number;
  gradientAngle?: number;
}

export interface GeneratedLogoResult {
  svgLight: string;       // For Dark backgrounds (Light text/fill)
  svgDark: string;        // For Light backgrounds (Dark text/fill)
  dataUrlLight: string;   // data:image/svg+xml;...
  dataUrlDark: string;
  faviconSvg: string;
  faviconDataUrl: string;
}

/**
 * Returns raw SVG path/elements for a given mark symbol
 */
function renderSymbolMarkup(
  markType: LogoMarkType, 
  gradientId: string, 
  colors: { primary: string; secondary: string; accent: string },
  letters: string,
  mode: 'light_surface' | 'dark_surface'
): string {
  const textColor = mode === 'light_surface' ? '#0f172a' : '#ffffff';

  switch (markType) {
    case 'hexagon_shield':
      return `
        <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="url(#${gradientId})" opacity="0.15" />
        <polygon points="50,10 86,30 86,70 50,90 14,70 14,30" fill="none" stroke="url(#${gradientId})" stroke-width="6" stroke-linejoin="round" />
        <polygon points="50,26 72,38 72,62 50,74 28,62 28,38" fill="url(#${gradientId})" />
        <circle cx="50" cy="50" r="6" fill="${textColor}" />
      `;

    case 'orbital_helix':
      return `
        <ellipse cx="50" cy="50" rx="38" ry="16" fill="none" stroke="url(#${gradientId})" stroke-width="5" transform="rotate(-30 50 50)" stroke-dasharray="140 10" />
        <ellipse cx="50" cy="50" rx="38" ry="16" fill="none" stroke="${colors.secondary}" stroke-width="5" transform="rotate(30 50 50)" opacity="0.85" />
        <circle cx="50" cy="50" r="14" fill="url(#${gradientId})" />
        <circle cx="78" cy="34" r="5" fill="${colors.accent}" />
        <circle cx="22" cy="66" r="4" fill="${colors.primary}" />
      `;

    case 'prism_cube':
      return `
        <!-- Top face -->
        <polygon points="50,14 82,32 50,50 18,32" fill="url(#${gradientId})" opacity="0.95" />
        <!-- Left face -->
        <polygon points="18,32 50,50 50,86 18,68" fill="${colors.primary}" opacity="0.75" />
        <!-- Right face -->
        <polygon points="50,50 82,32 82,68 50,86" fill="${colors.secondary}" opacity="0.9" />
        <line x1="50" y1="50" x2="50" y2="86" stroke="${textColor}" stroke-width="1.5" opacity="0.3" />
      `;

    case 'wave_pulse':
      return `
        <circle cx="50" cy="50" r="40" fill="url(#${gradientId})" opacity="0.12" />
        <path d="M16 50 C26 28, 34 72, 44 50 C54 28, 62 72, 72 50 C80 34, 84 50, 84 50" fill="none" stroke="url(#${gradientId})" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="44" cy="50" r="5" fill="${colors.primary}" />
        <circle cx="72" cy="50" r="5" fill="${colors.accent}" />
      `;

    case 'infinity_loop':
      return `
        <path d="M30 35 C42 35, 58 65, 70 65 C80 65, 86 58, 86 50 C86 42, 80 35, 70 35 C58 35, 42 65, 30 65 C20 65, 14 58, 14 50 C14 42, 20 35, 30 35 Z" 
          fill="none" stroke="url(#${gradientId})" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="70" cy="50" r="5" fill="${colors.accent}" />
        <circle cx="30" cy="50" r="5" fill="${colors.secondary}" />
      `;

    case 'stacked_layers':
      return `
        <polygon points="50,18 84,34 50,50 16,34" fill="url(#${gradientId})" />
        <polygon points="50,38 84,54 50,70 16,54" fill="url(#${gradientId})" opacity="0.65" />
        <polygon points="50,58 84,74 50,90 16,74" fill="url(#${gradientId})" opacity="0.35" />
      `;

    case 'diamond_apex':
      return `
        <polygon points="50,10 88,50 50,90 12,50" fill="url(#${gradientId})" opacity="0.15" />
        <polygon points="50,16 82,50 50,84 18,50" fill="none" stroke="url(#${gradientId})" stroke-width="6" stroke-linejoin="round" />
        <polygon points="50,30 68,50 50,70 32,50" fill="url(#${gradientId})" />
      `;

    case 'constellation':
      return `
        <line x1="26" y1="30" x2="74" y2="24" stroke="url(#${gradientId})" stroke-width="4" stroke-linecap="round" />
        <line x1="74" y1="24" x2="68" y2="76" stroke="url(#${gradientId})" stroke-width="4" stroke-linecap="round" />
        <line x1="68" y1="76" x2="28" y2="70" stroke="url(#${gradientId})" stroke-width="4" stroke-linecap="round" />
        <line x1="28" y1="70" x2="26" y2="30" stroke="url(#${gradientId})" stroke-width="4" stroke-linecap="round" />
        <line x1="26" y1="30" x2="68" y2="76" stroke="url(#${gradientId})" stroke-width="3" stroke-dasharray="4 4" opacity="0.7" />
        <circle cx="26" cy="30" r="9" fill="${colors.primary}" />
        <circle cx="74" cy="24" r="8" fill="${colors.secondary}" />
        <circle cx="68" cy="76" r="10" fill="url(#${gradientId})" />
        <circle cx="28" cy="70" r="7" fill="${colors.accent}" />
      `;

    case 'bio_leaf':
      return `
        <path d="M20 80 C20 30, 45 15, 80 15 C80 65, 55 80, 20 80 Z" fill="url(#${gradientId})" opacity="0.25" />
        <path d="M22 78 C22 34, 46 20, 78 18 C78 62, 54 78, 22 78 Z" fill="none" stroke="url(#${gradientId})" stroke-width="6" stroke-linejoin="round" />
        <path d="M24 76 C40 55, 55 40, 74 22" fill="none" stroke="${textColor}" stroke-width="4" stroke-linecap="round" opacity="0.6" />
        <path d="M46 50 C58 52, 66 58, 70 64" fill="none" stroke="${textColor}" stroke-width="3" stroke-linecap="round" opacity="0.5" />
      `;

    case 'cyber_spark':
      return `
        <polygon points="50,10 58,38 86,50 58,62 50,90 42,62 14,50 42,38" fill="url(#${gradientId})" />
        <circle cx="50" cy="50" r="7" fill="${textColor}" />
        <polygon points="50,26 54,42 70,50 54,58 50,74 46,58 30,50 46,42" fill="${textColor}" opacity="0.4" />
      `;

    case 'quantum_core':
      return `
        <circle cx="50" cy="50" r="38" fill="none" stroke="url(#${gradientId})" stroke-width="5" stroke-dasharray="16 8" />
        <circle cx="50" cy="50" r="26" fill="url(#${gradientId})" opacity="0.2" />
        <circle cx="50" cy="50" r="16" fill="url(#${gradientId})" />
        <circle cx="50" cy="50" r="6" fill="${textColor}" />
      `;

    case 'dynamic_wings':
      return `
        <path d="M12 65 C28 65, 42 45, 50 25 C58 45, 72 65, 88 65 C72 52, 58 40, 50 12 C42 40, 28 52, 12 65 Z" fill="url(#${gradientId})" />
        <path d="M22 75 C34 75, 44 60, 50 46 C56 60, 66 75, 78 75 C66 66, 56 55, 50 34 C44 55, 34 66, 22 75 Z" fill="url(#${gradientId})" opacity="0.6" />
      `;

    case 'monogram_circle':
      return `
        <circle cx="50" cy="50" r="42" fill="url(#${gradientId})" opacity="0.15" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#${gradientId})" stroke-width="6" />
        <text x="50" y="58" font-family="Plus Jakarta Sans, sans-serif" font-size="28" font-weight="900" text-anchor="middle" fill="url(#${gradientId})" letter-spacing="1">
          ${escapeXml(letters || 'A')}
        </text>
      `;

    case 'monogram_shield':
      return `
        <path d="M50 10 L84 24 C84 62, 50 88, 50 88 C50 88, 16 62, 16 24 Z" fill="url(#${gradientId})" opacity="0.15" />
        <path d="M50 12 L82 25 C82 60, 50 84, 50 84 C50 84, 18 60, 18 25 Z" fill="none" stroke="url(#${gradientId})" stroke-width="6" stroke-linejoin="round" />
        <text x="50" y="57" font-family="Plus Jakarta Sans, sans-serif" font-size="26" font-weight="900" text-anchor="middle" fill="url(#${gradientId})" letter-spacing="1">
          ${escapeXml(letters || 'A')}
        </text>
      `;

    case 'monogram_squircle':
      return `
        <rect x="10" y="10" width="80" height="80" rx="24" fill="url(#${gradientId})" />
        <text x="50" y="59" font-family="Plus Jakarta Sans, sans-serif" font-size="30" font-weight="900" text-anchor="middle" fill="${textColor}" letter-spacing="1">
          ${escapeXml(letters || 'A')}
        </text>
      `;

    default:
      return `<circle cx="50" cy="50" r="36" fill="url(#${gradientId})" />`;
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function extractInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Builds the complete SVG string for a specific background surface mode
 */
export function buildLogoSvg(
  config: LogoGeneratorConfig, 
  mode: 'light_surface' | 'dark_surface'
): string {
  const {
    brandName,
    tagline,
    markType,
    layout,
    colors,
    fontFamily = 'Plus Jakarta Sans',
    letterSpacing = 0.5,
    monogramLetters = extractInitials(config.brandName || 'Aurora'),
    gradientAngle = 135
  } = config;

  const gradientId = `brand-logo-grad-${Math.random().toString(36).substring(2, 8)}`;
  const textColor = mode === 'light_surface' ? '#0f172a' : '#ffffff';
  const taglineColor = mode === 'light_surface' ? '#64748b' : '#94a3b8';

  const symbolMarkup = renderSymbolMarkup(markType, gradientId, colors, monogramLetters, mode);

  const defs = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors.primary}" />
        <stop offset="60%" stop-color="${colors.secondary || colors.primary}" />
        <stop offset="100%" stop-color="${colors.accent || colors.primary}" />
      </linearGradient>
    </defs>
  `;

  // MARK ONLY
  if (layout === 'mark_only') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      ${defs}
      ${symbolMarkup}
    </svg>`.trim();
  }

  // WORDMARK ONLY
  if (layout === 'wordmark_only') {
    const hasTagline = Boolean(tagline && tagline.trim());
    const height = hasTagline ? 70 : 50;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 ${height}" width="100%" height="100%">
      ${defs}
      <text x="10" y="34" font-family="${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="${textColor}" letter-spacing="${letterSpacing}px">
        ${escapeXml(brandName || 'Brand')}
      </text>
      ${hasTagline ? `
        <text x="12" y="56" font-family="${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="${taglineColor}" letter-spacing="1.5px" text-transform="uppercase">
          ${escapeXml(tagline || '')}
        </text>
      ` : ''}
    </svg>`.trim();
  }

  // VERTICAL (STACKED)
  if (layout === 'vertical') {
    const hasTagline = Boolean(tagline && tagline.trim());
    const height = hasTagline ? 180 : 155;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 ${height}" width="100%" height="100%">
      ${defs}
      <g transform="translate(70, 10)">
        ${symbolMarkup}
      </g>
      <text x="120" y="132" font-family="${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" text-anchor="middle" fill="${textColor}" letter-spacing="${letterSpacing}px">
        ${escapeXml(brandName || 'Brand')}
      </text>
      ${hasTagline ? `
        <text x="120" y="154" font-family="${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" text-anchor="middle" fill="${taglineColor}" letter-spacing="1.5px" text-transform="uppercase">
          ${escapeXml(tagline || '')}
        </text>
      ` : ''}
    </svg>`.trim();
  }

  // HORIZONTAL (INLINE) - Standard default
  const hasTagline = Boolean(tagline && tagline.trim());
  const width = Math.max(280, (brandName || 'Brand').length * 18 + 100);
  const height = 64;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    ${defs}
    <!-- Symbol container -->
    <g transform="translate(6, 4) scale(0.56)">
      ${symbolMarkup}
    </g>
    <!-- Brand Title -->
    <text x="74" y="${hasTagline ? 33 : 40}" font-family="${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="${textColor}" letter-spacing="${letterSpacing}px">
      ${escapeXml(brandName || 'Brand')}
    </text>
    ${hasTagline ? `
      <!-- Tagline -->
      <text x="75" y="51" font-family="${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="600" fill="${taglineColor}" letter-spacing="1.2px" text-transform="uppercase">
        ${escapeXml(tagline || '')}
      </text>
    ` : ''}
  </svg>`.trim();
}

/**
 * Converts raw SVG string to an optimized Data URL
 */
export function svgToDataUrl(svgString: string): string {
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;utf8,${encoded}`;
}

/**
 * Generates the full suite of logo assets: Light Logo, Dark Logo, Favicon
 */
export function generateBrandLogoSuite(config: LogoGeneratorConfig): GeneratedLogoResult {
  const svgLight = buildLogoSvg(config, 'dark_surface'); // For dark UI surfaces (white text)
  const svgDark = buildLogoSvg(config, 'light_surface');  // For light UI surfaces (dark text)

  const faviconSvg = buildLogoSvg({ ...config, layout: 'mark_only' }, 'dark_surface');

  return {
    svgLight,
    svgDark,
    dataUrlLight: svgToDataUrl(svgLight),
    dataUrlDark: svgToDataUrl(svgDark),
    faviconSvg,
    faviconDataUrl: svgToDataUrl(faviconSvg)
  };
}

export const PRESET_LOGO_STYLES: Array<{
  id: string;
  name: string;
  category: string;
  markType: LogoMarkType;
  layout: LogoLayout;
  fontFamily: string;
}> = [
  { id: 'tech-prism', name: 'Prism Tech', category: 'Technology & Cloud', markType: 'prism_cube', layout: 'horizontal', fontFamily: 'Plus Jakarta Sans' },
  { id: 'shield-monogram', name: 'Shield Monogram', category: 'Enterprise & Security', markType: 'monogram_shield', layout: 'horizontal', fontFamily: 'Plus Jakarta Sans' },
  { id: 'orbital-helix', name: 'Orbital Helix', category: 'SaaS & Infrastructure', markType: 'orbital_helix', layout: 'horizontal', fontFamily: 'Space Grotesk' },
  { id: 'wave-pulse', name: 'Wave Pulse', category: 'Media & Analytics', markType: 'wave_pulse', layout: 'horizontal', fontFamily: 'Outfit' },
  { id: 'bio-leaf', name: 'Bio Organic', category: 'Health & Sciences', markType: 'bio_leaf', layout: 'horizontal', fontFamily: 'Outfit' },
  { id: 'cyber-spark', name: 'Cyber Spark', category: 'AI & Creative', markType: 'cyber_spark', layout: 'horizontal', fontFamily: 'Space Grotesk' },
  { id: 'diamond-apex', name: 'Apex Wealth', category: 'Finance & Advisory', markType: 'diamond_apex', layout: 'horizontal', fontFamily: 'Plus Jakarta Sans' },
  { id: 'quantum-core', name: 'Quantum Core', category: 'Deep Tech & Science', markType: 'quantum_core', layout: 'horizontal', fontFamily: 'JetBrains Mono' },
  { id: 'squircle-badge', name: 'Squircle Monogram', category: 'Modern Minimal', markType: 'monogram_squircle', layout: 'horizontal', fontFamily: 'Inter' }
];

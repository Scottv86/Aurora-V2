import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { GoogleGenAI } from '@google/genai';
import { checkAIFeatureOrThrow } from '../lib/aiPermissions';

const router = Router();

const getDbContext = async (req: TenantRequest) => {
  const db = req.db || globalPrisma;
  let tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || 'tenant-aurora-core';
  
  // Verify tenant exists, fallback to first tenant if default fallback string is passed
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

  return { db, tenantId, tenant: existingTenant };
};

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'brand';
}

// Auto-seed default brand kit if none exists
async function ensureDefaultBrandKit(db: any, tenantId: string, tenant?: any) {
  const count = await db.brandKit.count({ where: { tenantId } });
  if (count === 0) {
    const tenantObj = tenant || await db.tenant.findUnique({ where: { id: tenantId } });
    const tb = (tenantObj?.branding as any) || {};
    
    const defaultKit = await db.brandKit.create({
      data: {
        tenantId,
        name: tenantObj?.name ? `${tenantObj.name} Default` : 'Core Brand',
        slug: 'core-brand',
        description: 'Primary corporate identity and default brand kit for organization portals, documents, and reports.',
        isDefault: true,
        assets: {
          logoLight: tb.logoUrl || '',
          logoDark: tb.logoDarkUrl || tb.logoUrl || '',
          iconMark: tb.faviconUrl || '',
          favicon: tb.faviconUrl || '',
          letterheadBanner: '',
          socialOgImage: '',
          watermark: ''
        },
        colors: {
          primary: tb.primaryColor || '#4f46e5',
          secondary: '#0ea5e9',
          accent: tb.accentColor || '#6366f1',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
          chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
        },
        typography: {
          headingFont: 'Plus Jakarta Sans',
          bodyFont: 'Inter',
          monoFont: 'JetBrains Mono',
          fontSizeScale: 'medium'
        },
        styling: {
          borderRadius: '12px',
          buttonStyle: 'rounded',
          elevation: 'subtle',
          headerLayout: 'top_right',
          navLinkStyle: 'underline'
        },
        voiceAndTone: {
          tone: 'Professional & Approachable',
          boilerplate: `${tenantObj?.name || 'Our organization'} delivers enterprise excellence and modern collaborative workflows.`,
          tagline: 'Modern Platform Excellence',
          prohibitedWords: ['synergy', 'disruptive', 'cheap'],
          audiencePersona: 'Enterprise decision makers, managers, and internal team members'
        },
        emailDefaults: {
          signatureTemplate: 'standard',
          disclaimer: 'This email and any attachments are confidential and intended solely for the recipient.',
          socialLinks: {
            website: `https://${tenantObj?.subdomain || 'aurora'}.aurora.platform`,
            linkedin: '',
            twitter: ''
          }
        },
        metadata: {
          createdAutomatically: true
        }
      }
    });

    return [defaultKit];
  }
  return null;
}

// GET /api/brand-kits - Fetch all brand kits
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId, tenant } = await getDbContext(req);
    await ensureDefaultBrandKit(db, tenantId, tenant);

    const brandKits = await (db as any).brandKit.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { sites: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(brandKits);
  } catch (err: any) {
    console.error('[BrandKitsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch brand kits' });
  }
});

// GET /api/brand-kits/:id - Fetch single brand kit
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;

    const brandKit = await (db as any).brandKit.findFirst({
      where: { id, tenantId },
      include: {
        sites: {
          select: { id: true, name: true, domain: true, status: true }
        }
      }
    });

    if (!brandKit) {
      return res.status(404).json({ error: 'Brand kit not found' });
    }

    res.json(brandKit);
  } catch (err: any) {
    console.error('[BrandKitsAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch brand kit' });
  }
});

// POST /api/brand-kits - Create new brand kit
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const {
      name,
      description,
      isDefault,
      assets,
      colors,
      typography,
      styling,
      voiceAndTone,
      emailDefaults,
      metadata
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    let baseSlug = slugify(name);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await (db as any).brandKit.findFirst({ where: { tenantId, slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    // If marked as default, unset other defaults
    if (isDefault) {
      await (db as any).brandKit.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newBrandKit = await (db as any).brandKit.create({
      data: {
        tenantId,
        name: name.trim(),
        slug: uniqueSlug,
        description: description || null,
        isDefault: Boolean(isDefault),
        assets: assets || {},
        colors: colors || {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
          accent: '#6366f1',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
          chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
        },
        typography: typography || {
          headingFont: 'Plus Jakarta Sans',
          bodyFont: 'Inter',
          monoFont: 'JetBrains Mono',
          fontSizeScale: 'medium'
        },
        styling: styling || {
          borderRadius: '12px',
          buttonStyle: 'rounded',
          elevation: 'subtle',
          headerLayout: 'top_right',
          navLinkStyle: 'underline'
        },
        voiceAndTone: voiceAndTone || {},
        emailDefaults: emailDefaults || {},
        metadata: metadata || {}
      }
    });

    res.status(201).json(newBrandKit);
  } catch (err: any) {
    console.error('[BrandKitsAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create brand kit' });
  }
});

// PUT /api/brand-kits/:id - Update brand kit
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;
    const {
      name,
      description,
      isDefault,
      assets,
      colors,
      typography,
      styling,
      voiceAndTone,
      emailDefaults,
      metadata
    } = req.body;

    const existing = await (db as any).brandKit.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Brand kit not found' });
    }

    if (isDefault && !existing.isDefault) {
      await (db as any).brandKit.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updated = await (db as any).brandKit.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        ...(assets ? { assets } : {}),
        ...(colors ? { colors } : {}),
        ...(typography ? { typography } : {}),
        ...(styling ? { styling } : {}),
        ...(voiceAndTone ? { voiceAndTone } : {}),
        ...(emailDefaults ? { emailDefaults } : {}),
        ...(metadata ? { metadata } : {})
      }
    });

    // If this is default, also keep tenant.branding primary colors synced for legacy components
    if (updated.isDefault && updated.colors) {
      const colorsObj = updated.colors as any;
      const assetsObj = (updated.assets || {}) as any;
      await (db as any).tenant.update({
        where: { id: tenantId },
        data: {
          branding: {
            primaryColor: colorsObj.primary || '#4f46e5',
            accentColor: colorsObj.accent || '#6366f1',
            logoUrl: assetsObj.logoLight || assetsObj.logoDark || '',
            faviconUrl: assetsObj.favicon || '',
            useTenantBranding: true
          }
        }
      });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[BrandKitsAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update brand kit' });
  }
});

// POST /api/brand-kits/:id/set-default - Set as default
router.post('/:id/set-default', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;

    const existing = await (db as any).brandKit.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Brand kit not found' });
    }

    await (db as any).brandKit.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false }
    });

    const updated = await (db as any).brandKit.update({
      where: { id },
      data: { isDefault: true }
    });

    // Sync legacy tenant.branding
    if (updated.colors) {
      const colorsObj = updated.colors as any;
      const assetsObj = (updated.assets || {}) as any;
      await (db as any).tenant.update({
        where: { id: tenantId },
        data: {
          branding: {
            primaryColor: colorsObj.primary || '#4f46e5',
            accentColor: colorsObj.accent || '#6366f1',
            logoUrl: assetsObj.logoLight || assetsObj.logoDark || '',
            faviconUrl: assetsObj.favicon || '',
            useTenantBranding: true
          }
        }
      });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[BrandKitsAPI] set-default Error:', err);
    res.status(500).json({ error: err.message || 'Failed to set default brand kit' });
  }
});

// DELETE /api/brand-kits/:id - Delete brand kit
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;

    const brandKit = await (db as any).brandKit.findFirst({
      where: { id, tenantId }
    });

    if (!brandKit) {
      return res.status(404).json({ error: 'Brand kit not found' });
    }

    const totalCount = await (db as any).brandKit.count({ where: { tenantId } });
    if (totalCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only brand kit. At least one brand kit must remain.' });
    }

    // If deleting the default, promote another brand kit to default
    if (brandKit.isDefault) {
      const nextBrand = await (db as any).brandKit.findFirst({
        where: { tenantId, id: { not: id } },
        orderBy: { createdAt: 'asc' }
      });
      if (nextBrand) {
        await (db as any).brandKit.update({
          where: { id: nextBrand.id },
          data: { isDefault: true }
        });
      }
    }

    // Detach from sites (set site.brandId = null)
    await (db as any).site.updateMany({
      where: { brandId: id },
      data: { brandId: null }
    });

    await (db as any).brandKit.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Brand kit deleted successfully' });
  } catch (err: any) {
    console.error('[BrandKitsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete brand kit' });
  }
});

// POST /api/brand-kits/generate-palette - AI Brand Kit generation
router.post('/generate-palette', async (req: TenantRequest, res: Response) => {
  try {
    const { prompt, industry, brandName } = req.body;
    const { db, tenantId } = await getDbContext(req);
    await checkAIFeatureOrThrow(tenantId, (req as any).user?.uid, 'ai:brand_kit_generator', db);

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const aiPrompt = `You are an expert brand designer and design system architect.
Generate a cohesive, accessible, professional design system and brand profile for:
Brand Name: "${brandName || 'Modern Brand'}"
Industry / Vibe: "${industry || 'Technology & Innovation'}"
Extra Context: "${prompt || 'Clean, sophisticated, modern enterprise aesthetic'}"

Return ONLY valid JSON with no markdown backticks, matching this exact JSON schema:
{
  "colors": {
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "accent": "#hexcode",
    "background": "#ffffff",
    "surface": "#f8fafc",
    "text": "#0f172a",
    "muted": "#64748b",
    "border": "#e2e8f0",
    "chartPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6"]
  },
  "typography": {
    "headingFont": "Plus Jakarta Sans | Outfit | Inter | Syne | Poppins | Space Grotesk",
    "bodyFont": "Inter | Plus Jakarta Sans | Roboto | Open Sans",
    "monoFont": "JetBrains Mono | Fira Code",
    "fontSizeScale": "medium"
  },
  "styling": {
    "borderRadius": "8px | 12px | 16px | 24px",
    "buttonStyle": "rounded | pill | square",
    "elevation": "subtle | flat | elevated"
  },
  "voiceAndTone": {
    "tone": "e.g. Modern & Confident",
    "boilerplate": "2-3 sentences company mission statement",
    "tagline": "Short memorable punchy tagline",
    "prohibitedWords": ["cheap", "disruptive", "synergy"],
    "audiencePersona": "Target customer summary"
  }
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: aiPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } catch (aiErr) {
        console.warn('[BrandKitAI] AI generation fallback:', aiErr);
      }
    }

    // Fallback curated palette generator
    const curatedThemes = [
      {
        colors: {
          primary: '#6366f1',
          secondary: '#06b6d4',
          accent: '#8b5cf6',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
          chartPalette: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
        },
        typography: {
          headingFont: 'Plus Jakarta Sans',
          bodyFont: 'Inter',
          monoFont: 'JetBrains Mono',
          fontSizeScale: 'medium'
        },
        styling: {
          borderRadius: '12px',
          buttonStyle: 'rounded',
          elevation: 'subtle'
        },
        voiceAndTone: {
          tone: 'Innovative & Visionary',
          boilerplate: 'Empowering teams with next-generation collaborative workflows and intelligent operations.',
          tagline: 'Intelligence Built In',
          prohibitedWords: ['legacy', 'slow', 'clunky'],
          audiencePersona: 'Modern tech teams, product managers, and scale-ups'
        }
      },
      {
        colors: {
          primary: '#0f766e',
          secondary: '#0284c7',
          accent: '#14b8a6',
          background: '#ffffff',
          surface: '#f0fdfa',
          text: '#134e4a',
          muted: '#5eead4',
          border: '#ccfbf1',
          chartPalette: ['#0f766e', '#14b8a6', '#0284c7', '#38bdf8', '#059669', '#34d399']
        },
        typography: {
          headingFont: 'Outfit',
          bodyFont: 'Inter',
          monoFont: 'JetBrains Mono',
          fontSizeScale: 'medium'
        },
        styling: {
          borderRadius: '16px',
          buttonStyle: 'pill',
          elevation: 'elevated'
        },
        voiceAndTone: {
          tone: 'Sustainable, Trustworthy & Direct',
          boilerplate: 'Building ethical and high-performance digital platforms for sustainable enterprise growth.',
          tagline: 'Smarter Systems. Better Outcomes.',
          prohibitedWords: ['complex', 'rigid'],
          audiencePersona: 'Enterprise executives, eco-conscious organizations'
        }
      }
    ];

    const pick = curatedThemes[Math.floor(Math.random() * curatedThemes.length)];
    res.json(pick);
  } catch (err: any) {
    console.error('[BrandKitsAPI] AI Palette error:', err);
    res.status(500).json({ error: 'Failed to generate palette' });
  }
});

// POST /api/brand-kits/generate-logo - AI Logo Mark Style & Parameter Recommendation
router.post('/generate-logo', async (req: TenantRequest, res: Response) => {
  try {
    const { prompt, brandName, industry } = req.body;
    const { db, tenantId } = await getDbContext(req);
    await checkAIFeatureOrThrow(tenantId, (req as any).user?.uid, 'ai:brand_kit_generator', db);

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const aiPrompt = `You are an expert identity and vector logo designer.
Given this brand context:
Brand Name: "${brandName || 'Brand'}"
Industry / Scope: "${industry || 'Technology'}"
User Prompt / Aesthetic: "${prompt || 'Modern, clean vector emblem'}"

Select the most suitable vector mark type and styling from this list:
Mark Types:
- "hexagon_shield" (Security, Enterprise, Cloud)
- "orbital_helix" (SaaS, Networks, Space, Connectivity)
- "prism_cube" (Data, Modular, Web3, Infrastructure)
- "wave_pulse" (Analytics, Audio, Media, Energy)
- "infinity_loop" (Continuity, DevOps, Automation)
- "stacked_layers" (Platform, Architecture, Cloud)
- "diamond_apex" (Finance, Luxury, Advisory)
- "constellation" (Collaboration, Graph, AI)
- "bio_leaf" (Health, Sustainability, Ecology)
- "cyber_spark" (Gaming, Creativity, Next-Gen AI)
- "quantum_core" (Deep Tech, Science, Crypto)
- "dynamic_wings" (Aviation, Logistics, Acceleration)
- "monogram_shield" (Classic Enterprise, Law, Security)
- "monogram_circle" (Modern Direct, Social, Minimal)
- "monogram_squircle" (Sleek App, Mobile, Developer)

Return ONLY a JSON object with this exact shape:
{
  "markType": "one of the above mark types",
  "layout": "horizontal | vertical | mark_only | wordmark_only",
  "tagline": "Short 2-4 word memorable tagline",
  "fontFamily": "Plus Jakarta Sans | Outfit | Space Grotesk | Inter | JetBrains Mono",
  "rationale": "Brief 1-sentence design rationale"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: aiPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } catch (aiErr) {
        console.warn('[BrandKitAI] AI logo recommendation fallback:', aiErr);
      }
    }

    // Fallback
    res.json({
      markType: 'hexagon_shield',
      layout: 'horizontal',
      tagline: 'Platform Excellence',
      fontFamily: 'Plus Jakarta Sans',
      rationale: 'Clean geometric shield with balanced modern typography.'
    });
  } catch (err: any) {
    console.error('[BrandKitsAPI] AI Logo generation error:', err);
    res.status(500).json({ error: 'Failed to generate logo recommendations' });
  }
});

export default router;

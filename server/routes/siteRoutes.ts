import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

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

  return { db, tenantId };
};


// GET all sites for the current tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { category, status } = req.query;

    const whereClause: any = { tenantId };
    if (category && category !== 'all') {
      whereClause.category = String(category);
    }
    if (status && status !== 'all') {
      whereClause.status = String(status);
    }

    const sites = await (db as any).site.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(sites);
  } catch (err: any) {
    console.error('[SitesAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch sites' });
  }
});


// GET single site by ID
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;

    const site = await (db as any).site.findFirst({
      where: { id, tenantId }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(site);
  } catch (err: any) {
    console.error('[SitesAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch site details' });
  }
});

// POST create new site
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { 
      name, 
      description, 
      category, 
      type, 
      domain, 
      status, 
      access, 
      branding, 
      navConfig, 
      pagesConfig, 
      metrics 
    } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: 'Site name and URL/Domain are required' });
    }

    const defaultMetricMapping: Record<string, { metricLabel: string; metricValue: string }> = {
      internal: { metricLabel: 'Active Members', metricValue: '1' },
      external: { metricLabel: 'Forms Published', metricValue: '1' },
      public: { metricLabel: 'Monthly Traffic', metricValue: '0 views' }
    };

    const siteCategory = category || 'internal';
    const siteType = type || (siteCategory === 'internal' ? 'Intranet Hub' : siteCategory === 'external' ? 'Customer Portal' : 'Landing Page');

    const defaultBranding = branding || {
      accentColor: '#3b82f6',
      logoUrl: '',
      headerTitle: name,
      footerText: 'Powered by Aurora Platform',
      themeMode: 'dark'
    };

    const defaultNavConfig = navConfig || [
      { id: 'nav-1', label: 'Home', path: '/' },
      { id: 'nav-2', label: 'Services & Knowledge', path: '/services' },
      { id: 'nav-3', label: 'Support & Contact', path: '/contact' }
    ];

    const defaultPages = [
      {
        id: 'page-home',
        title: 'Home Portal',
        slug: '/',
        description: 'Main portal home page and service hub.',
        isHome: true,
        widgets: [
          { id: 'w-hero', type: 'hero', enabled: true, title: `Welcome to ${name}`, subtitle: description || 'Your official self-service portal hub.' },
          { id: 'w-announcements', type: 'announcements', enabled: true, title: 'Portal News & Updates' },
          { id: 'w-status', type: 'status_widget', enabled: true, title: 'Live System Health Status' }
        ]
      },
      {
        id: 'page-bonds',
        title: 'Property Bond Lodgement',
        slug: '/bonds',
        description: 'Lodge and manage property bonds directly with the Aurora Tenancy Register.',
        isHome: false,
        widgets: [
          { id: 'w-bond-hub', type: 'bond_lodgement', enabled: true, title: 'Property Bond Lodgement Portal' },
          { id: 'w-record-grid', type: 'record_grid', enabled: true, title: 'Live Tenancy Records Feed' }
        ]
      },
      {
        id: 'page-tracker',
        title: 'Status Tracker & Live Chat',
        slug: '/tracker',
        description: 'Track application progress and chat live with online support staff.',
        isHome: false,
        widgets: [
          { id: 'w-status-tracker', type: 'status_tracker', enabled: true, title: 'Application / Bond Status Tracker' },
          { id: 'w-live-chat', type: 'live_chat', enabled: true, title: 'Online Customer Support Live Chat' }
        ]
      },
      {
        id: 'page-auth',
        title: 'Portal Access & SSO',
        slug: '/auth',
        description: 'Portal member login and third-party SSO authentication.',
        isHome: false,
        widgets: [
          { id: 'w-portal-auth', type: 'auth_widget', enabled: true, title: 'Portal Member Access & SSO' }
        ]
      },
      {
        id: 'page-services',
        title: 'Services & Knowledge',
        slug: '/services',
        description: 'Knowledge base articles and technical guides.',
        isHome: false,
        widgets: [
          { id: 'w-kb-search', type: 'kb_search', enabled: true, title: 'Search Knowledge Base' }
        ]
      },
      {
        id: 'page-contact',
        title: 'Support & Intake',
        slug: '/contact',
        description: 'Submit inquiries and support tickets.',
        isHome: false,
        widgets: [
          { id: 'w-contact-form', type: 'ticket_form', enabled: true, title: 'Submit an Inquiry / Support Ticket' }
        ]
      }
    ];

    const defaultPagesConfig = pagesConfig || defaultPages;

    const site = await (db as any).site.create({
      data: {
        tenantId,
        name,
        description: description || 'No description provided.',
        category: siteCategory,
        type: siteType,
        domain,
        status: status || 'active',
        access: access || 'Authenticated',
        branding: defaultBranding,
        navConfig: defaultNavConfig,
        pagesConfig: defaultPagesConfig,
        metrics: metrics || defaultMetricMapping[siteCategory] || { metricLabel: 'Active Members', metricValue: '1' }
      }
    });


    res.status(201).json(site);
  } catch (err: any) {
    console.error('[SitesAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create site' });
  }
});

// PUT update site details, branding, and widget pages
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;
    const { 
      name, 
      description, 
      category, 
      type, 
      domain, 
      status, 
      access, 
      branding, 
      navConfig, 
      pagesConfig, 
      metrics 
    } = req.body;

    const existing = await (db as any).site.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const updated = await (db as any).site.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        category: category !== undefined ? category : existing.category,
        type: type !== undefined ? type : existing.type,
        domain: domain !== undefined ? domain : existing.domain,
        status: status !== undefined ? status : existing.status,
        access: access !== undefined ? access : existing.access,
        branding: branding !== undefined ? branding : existing.branding,
        navConfig: navConfig !== undefined ? navConfig : existing.navConfig,
        pagesConfig: pagesConfig !== undefined ? pagesConfig : existing.pagesConfig,
        metrics: metrics !== undefined ? metrics : existing.metrics
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[SitesAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update site' });
  }
});

// PATCH update site status
router.patch('/:id/status', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const existing = await (db as any).site.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const updated = await (db as any).site.update({
      where: { id },
      data: { status }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[SitesAPI] PATCH /:id/status Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update site status' });
  }
});

// DELETE a site
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;

    const existing = await (db as any).site.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Site not found' });
    }

    await (db as any).site.delete({
      where: { id }
    });

    res.json({ success: true, message: `Site "${existing.name}" deleted successfully.` });
  } catch (err: any) {
    console.error('[SitesAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete site' });
  }
});

// POST /api/sites/:id/export-mobile-bundle
// Generates mobile application export package for iOS (App Store) & Android (Play Store) via Capacitor/Expo
router.post('/:id/export-mobile-bundle', async (req: TenantRequest, res: Response) => {
  try {
    const { db, tenantId } = await getDbContext(req);
    const { id } = req.params;
    const { config } = req.body;

    const site = await (db as any).site.findFirst({
      where: { id, tenantId }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const appId = config?.appId || `com.aurora.${site.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const appName = config?.appName || site.name;
    const version = config?.version || '1.0.0';

    const mobileManifest = {
      generator: 'Aurora Universal Site & Mobile Builder v2.0',
      timestamp: new Date().toISOString(),
      siteId: site.id,
      tenantId: site.tenantId,
      app: {
        appId,
        appName,
        version,
        buildNumber: config?.buildNumber || 1,
        platform: config?.platform || 'all',
        entryUrl: `https://${site.domain || 'aurora-portal.local'}/portal/${site.id}`,
        branding: site.branding || {},
        pushEnabled: !!config?.pushNotificationsEnabled,
        cameraEnabled: !!config?.cameraAccessEnabled,
        biometricsEnabled: !!config?.biometricsEnabled
      },
      capacitorConfig: {
        appId,
        appName,
        webDir: 'dist',
        server: {
          url: `https://${site.domain || 'aurora-portal.local'}/portal/${site.id}`,
          cleartext: false
        },
        plugins: {
          PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
          SplashScreen: { backgroundColor: config?.splashBgColor || "#09090b", launchShowDuration: 2000 }
        }
      },
      reactNativeExpoConfig: {
        name: appName,
        slug: appName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        version,
        orientation: 'portrait',
        icon: config?.iconUrl || './assets/icon.png',
        userInterfaceStyle: 'dark',
        splash: {
          image: config?.iconUrl || './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: config?.splashBgColor || '#09090b'
        },
        ios: {
          supportsTablet: true,
          bundleIdentifier: appId
        },
        android: {
          adaptiveIcon: {
            foregroundImage: config?.iconUrl || './assets/adaptive-icon.png',
            backgroundColor: config?.splashBgColor || '#09090b'
          },
          package: appId
        }
      },
      buildCommands: {
        capacitorAndroid: `npx cap add android && npx cap open android`,
        capacitorIos: `npx cap add ios && npx cap open ios`,
        expoBuild: `npx eas build --platform all`
      }
    };

    res.json({
      success: true,
      message: 'Mobile app bundle manifest compiled successfully!',
      manifest: mobileManifest
    });
  } catch (err: any) {
    console.error('[SitesAPI] POST /:id/export-mobile-bundle Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate mobile export package' });
  }
});

export default router;

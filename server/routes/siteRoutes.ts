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
        title: 'Home',
        slug: '/',
        description: 'Main portal home page.',
        isHome: true,
        widgets: [
          { id: 'w-hero', type: 'hero', enabled: true, title: `Welcome to ${name}`, subtitle: description || 'Your official portal hub.' },
          { id: 'w-announcements', type: 'announcements', enabled: true, title: 'Portal News & Updates' },
          { id: 'w-status', type: 'status_widget', enabled: siteCategory === 'public', title: 'Live Service Status' }
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
        title: 'Support & Contact',
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


export default router;

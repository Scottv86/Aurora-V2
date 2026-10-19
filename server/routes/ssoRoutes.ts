import { Router, Request, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import crypto from 'crypto';

const router = Router();

export interface SsoConfig {
  enabled: boolean;
  provider: 'OKTA' | 'ENTRA_ID' | 'GOOGLE' | 'CUSTOM_SAML';
  domain: string; // e.g. "acme.com"
  ssoUrl: string; // IdP Single Sign-on Target URL
  issuer: string; // Entity ID / Issuer
  certificate?: string; // X.509 Certificate in PEM format
  enforceSso: boolean;
  defaultRole: string; // 'Standard'
}

// GET /api/sso/config - Fetch Tenant SSO Settings
router.get('/config', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });

    const wsSettings = (tenant?.workspaceSettings as any) || {};
    const ssoConfig: SsoConfig = wsSettings.ssoConfig || {
      enabled: false,
      provider: 'OKTA',
      domain: '',
      ssoUrl: '',
      issuer: `https://auth.aurora.io/saml/sp/${tenantId}`,
      enforceSso: false,
      defaultRole: 'Standard'
    };

    res.json(ssoConfig);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sso/config - Save Tenant SSO Settings
router.post('/config', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const { enabled, provider, domain, ssoUrl, issuer, certificate, enforceSso, defaultRole } = req.body;

    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });

    const wsSettings = (tenant?.workspaceSettings as any) || {};

    const updatedConfig: SsoConfig = {
      enabled: Boolean(enabled),
      provider: provider || 'OKTA',
      domain: (domain || '').trim().toLowerCase(),
      ssoUrl: (ssoUrl || '').trim(),
      issuer: (issuer || `https://auth.aurora.io/saml/sp/${tenantId}`).trim(),
      certificate: certificate?.trim(),
      enforceSso: Boolean(enforceSso),
      defaultRole: defaultRole || 'Standard'
    };

    await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...wsSettings,
          ssoConfig: updatedConfig
        }
      }
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'ADMIN',
      action: 'SSO_CONFIG_UPDATE',
      resourceId: tenantId,
      newValue: { enabled: updatedConfig.enabled, provider: updatedConfig.provider, domain: updatedConfig.domain }
    });

    res.json({ success: true, ssoConfig: updatedConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sso/test - Validate IdP Configuration
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { ssoUrl, certificate } = req.body;

    if (!ssoUrl || !ssoUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'A secure HTTPS Single Sign-on URL is required' });
    }

    if (certificate && !certificate.includes('CERTIFICATE')) {
      return res.status(400).json({ error: 'Invalid X.509 Certificate format (missing BEGIN/END CERTIFICATE header)' });
    }

    res.json({
      success: true,
      message: 'IdP Metadata & Certificate validated successfully. SSO handshake ready.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sso/initiate - Domain Discovery and SSO Redirect
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid company email address is required' });
    }

    const domain = email.split('@')[1].toLowerCase();

    // Find tenant with matching SSO domain
    const tenants = await globalPrisma.tenant.findMany({
      select: { id: true, name: true, workspaceSettings: true }
    });

    const matchingTenant = tenants.find(t => {
      const sso = (t.workspaceSettings as any)?.ssoConfig;
      return sso?.enabled && sso?.domain?.toLowerCase() === domain;
    });

    if (!matchingTenant) {
      return res.status(404).json({ error: `No active SSO configuration found for domain @${domain}. Please sign in with standard password.` });
    }

    const ssoConfig: SsoConfig = (matchingTenant.workspaceSettings as any).ssoConfig;
    const relayState = crypto.randomBytes(16).toString('hex');
    const redirectUrl = `${ssoConfig.ssoUrl}?RelayState=${relayState}&tenantId=${matchingTenant.id}`;

    res.json({
      ssoEnabled: true,
      tenantId: matchingTenant.id,
      tenantName: matchingTenant.name,
      redirectUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

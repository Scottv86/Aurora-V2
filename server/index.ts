import { spawnSync } from 'child_process';

// Ensure Windows system CA root certificates are trusted (e.g., for antivirus SSL proxies or enterprise certs)
if (process.platform === 'win32' && !process.execArgv.includes('--use-system-ca') && !process.env._NODE_SYSTEM_CA_RESPAWNED) {
  const result = spawnSync(
    process.execPath,
    ['--use-system-ca', ...process.execArgv, ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, _NODE_SYSTEM_CA_RESPAWNED: '1' } }
  );
  process.exit(result.status ?? 0);
}

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import dataRoutes from './routes/dataRoutes';
import platformRoutes from './routes/platformRoutes';
import publicRoutes from './routes/publicRoutes';
import memberRoutes from './routes/memberRoutes';
import teamRoutes from './routes/teamRoutes';
import positionRoutes from './routes/positionRoutes';
import permissionRoutes from './routes/permissionRoutes';
import auditRoutes from './routes/auditRoutes';
import billingRoutes from './routes/billingRoutes';
import peopleOrgRoutes from './routes/peopleOrgRoutes';
import taxonomyRoutes from './routes/taxonomyRoutes';
import tenantRoutes from './routes/tenantRoutes';
import architectRoutes from './routes/architectRoutes';
import connectorRoutes from './routes/connectorRoutes';
import nexusProxyRoutes from './routes/nexusProxyRoutes';
import automationRoutes from './routes/automationRoutes';
import pricingCatalogRoutes from './routes/pricingCatalogRoutes';
import queryExplorerRoutes from './routes/queryExplorerRoutes';
import reportRoutes from './routes/reportRoutes';
import antigravityRoutes from './routes/antigravityRoutes';
import aiSettingsRoutes from './routes/aiSettingsRoutes';
import trashRoutes from './routes/trashRoutes';
import digitalTwinRoutes from './routes/digitalTwin';
import siteRoutes from './routes/siteRoutes';
import formRoutes from './routes/formRoutes';
import workflowRoutes from './routes/workflowRoutes';
import validationRoutes from './routes/validationRoutes';
import solutionRoutes from './routes/solutionRoutes';
import queueRoutes from './routes/queueRoutes';
import savedQueryRoutes from './routes/savedQueryRoutes';
import savedViewRoutes from './routes/savedViewRoutes';
import kpiRoutes from './routes/kpiRoutes';
import inboxRoutes from './routes/inboxRoutes';
import chatRoutes from './routes/chatRoutes';
import searchRoutes from './routes/searchRoutes';
import brandKitRoutes from './routes/brandKitRoutes';
import templateRoutes from './routes/templateRoutes';
import documentRoutes from './routes/documentRoutes';
import financeRoutes from './routes/financeRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import voucherRoutes from './routes/voucherRoutes';
import posRoutes from './routes/posRoutes';
import reconciliationRoutes from './routes/reconciliationRoutes';
import transactionRoutes from './routes/transactionRoutes';
import rmaRoutes from './routes/rmaRoutes';
import paymentGatewayRoutes from './routes/paymentGatewayRoutes';



import { authenticate, requireSuperAdmin } from './middleware/authMiddleware';
import { requireTenantAccess } from './middleware/tenantMiddleware';
import http from 'http';
import { initSocket } from './socket';
import { AutomationScheduler } from './services/scheduler';
import { EmailWorker } from './services/emailWorker';

dotenv.config();

const app = express();

// Trust reverse proxy (Cloudflare, Railway, Render, AWS ALB, Nginx) so req.ip and rate limiters resolve real client IPs
const trustProxyConfig = process.env.TRUST_PROXY ? (process.env.TRUST_PROXY === 'true' ? true : Number(process.env.TRUST_PROXY)) : 1;
app.set('trust proxy', trustProxyConfig);

// Increase maxHeaderSize to 32KB to handle large Supabase JWTs (default 16KB causes 431 errors)
const httpServer = http.createServer({ maxHeaderSize: 32768 }, app);
const PORT = 3001;

// Security Headers & Fingerprint Reduction
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false, // Vite React SPA has its own client bundles; document streams inject their own sandbox CSP
  crossOriginEmbedderPolicy: false,
  xContentTypeOptions: true, // nosniff
  xFrameOptions: { action: 'sameorigin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  dnsPrefetchControl: { allow: false }
}));

// Dynamic CORS Configuration
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const configuredOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-invoice-token', 'x-aurora-signature'],
  credentials: true
}));

// Multi-Tiered Rate Limiters
// 1. General API: 600 req per 15 min per IP
const globalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many API requests, please try again later.' }
});

// 2. Public portal submissions: 100 req per 15 min per IP
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// 3. Authentication attempts: 60 req per 15 min per IP
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// 4. AI endpoints (Antigravity & AI settings): 30 req per 1 min per IP to protect Gemini API quota
const aiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please slow down and try again.' }
});

// 5. Document upload limiter: 40 uploads per 15 min per IP
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Document upload limit reached. Please wait before uploading more files.' }
});

app.use('/api', globalApiRateLimiter);
app.use('/api/public', publicRateLimiter);
app.use('/api/auth', authRateLimiter);
app.use('/api/antigravity', aiRateLimiter);
app.use('/api/ai', aiRateLimiter);
app.use('/api/documents/upload', uploadRateLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

// Initialize WebSockets
initSocket(httpServer);

// Public Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'Aurora Platform API',
    v: '2026-05-15.1' 
  });
});

// Registry & Auth Routes
app.use('/api/auth', authRoutes);

// Admin Registry Routes (Protected: SuperAdmin only)
app.use('/api/admin', authenticate, requireSuperAdmin, adminRoutes);

// Tenant Data Routes (Protected: Tenant Access only)
app.use('/api/data', authenticate, requireTenantAccess, dataRoutes);

// Platform Helper Routes (Context, Me)
app.use('/api/platform', authenticate, platformRoutes);

// Staff Management (Members & Teams)
app.use('/api/members', authenticate, requireTenantAccess, memberRoutes);
app.use('/api/teams', authenticate, requireTenantAccess, teamRoutes);
app.use('/api/positions', authenticate, requireTenantAccess, positionRoutes);
app.use('/api/permissions', authenticate, requireTenantAccess, permissionRoutes);
app.use('/api/audit', authenticate, requireTenantAccess, auditRoutes);
app.use('/api/billing', authenticate, requireTenantAccess, billingRoutes);
app.use('/api/people-organisations', authenticate, requireTenantAccess, peopleOrgRoutes);
app.use('/api/taxonomies', authenticate, requireTenantAccess, taxonomyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/architect', authenticate, requireTenantAccess, architectRoutes);
app.use('/api/connectors', authenticate, requireTenantAccess, connectorRoutes);
app.use('/api/nexus-proxy', authenticate, requireTenantAccess, nexusProxyRoutes);
app.use('/api/automations', authenticate, requireTenantAccess, automationRoutes);
app.use('/api/pricing-catalog', authenticate, requireTenantAccess, pricingCatalogRoutes);
app.use('/api/query-explorer', authenticate, requireTenantAccess, queryExplorerRoutes);
app.use('/api/reports', authenticate, requireTenantAccess, reportRoutes);
app.use('/api/antigravity', authenticate, requireTenantAccess, antigravityRoutes);
app.use('/api/ai', authenticate, requireTenantAccess, aiSettingsRoutes);
app.use('/api/trash', authenticate, requireTenantAccess, trashRoutes);
app.use('/api/digital-twin', authenticate, requireTenantAccess, digitalTwinRoutes);
app.use('/api/sites', authenticate, requireTenantAccess, siteRoutes);
app.use('/api/forms', authenticate, requireTenantAccess, formRoutes);
app.use('/api/workflows', authenticate, requireTenantAccess, workflowRoutes);
app.use('/api/validations', authenticate, requireTenantAccess, validationRoutes);
app.use('/api/solutions', authenticate, requireTenantAccess, solutionRoutes);
app.use('/api/queues', authenticate, requireTenantAccess, queueRoutes);
app.use('/api/saved-queries', authenticate, requireTenantAccess, savedQueryRoutes);
app.use('/api/searches', authenticate, requireTenantAccess, searchRoutes);
app.use('/api/saved-views', authenticate, requireTenantAccess, savedViewRoutes);
app.use('/api/kpis', authenticate, requireTenantAccess, kpiRoutes);
app.use('/api/inbox', authenticate, requireTenantAccess, inboxRoutes);
app.use('/api/chat', authenticate, requireTenantAccess, chatRoutes);
app.use('/api/brand-kits', authenticate, requireTenantAccess, brandKitRoutes);
app.use('/api/templates', authenticate, requireTenantAccess, templateRoutes);
app.use('/api/documents', documentRoutes);

// Commerce & Financial Suite Routes
app.use('/api/finance', authenticate, requireTenantAccess, financeRoutes);
app.use('/api/invoices', authenticate, requireTenantAccess, invoiceRoutes);
app.use('/api/inventory', authenticate, requireTenantAccess, inventoryRoutes);
app.use('/api/vouchers', authenticate, requireTenantAccess, voucherRoutes);
app.use('/api/pos', authenticate, requireTenantAccess, posRoutes);
app.use('/api/reconciliation', authenticate, requireTenantAccess, reconciliationRoutes);
app.use('/api/transactions', authenticate, requireTenantAccess, transactionRoutes);
app.use('/api/rma', authenticate, requireTenantAccess, rmaRoutes);
app.use('/api/payment-gateways', authenticate, requireTenantAccess, paymentGatewayRoutes);






// Public API Routes (Portal submissions)
app.use('/api/public', publicRoutes);

/**
 * JSON 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

/**
 * Global Error Handler with Incident ID generation and Production Error Masking
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const incidentId = crypto.randomUUID();
  console.error(`[Global Error] [Incident: ${incidentId}] ${req.method} ${req.originalUrl}:`, err);

  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'System received a malformed JSON payload.', incidentId });
  }

  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    return res.status(statusCode).json({
      error: 'An unexpected internal error occurred. Please quote the incident ID to support if this persists.',
      incidentId
    });
  }

  res.status(statusCode).json({ 
    error: err.message || 'Unexpected server error occurred',
    incidentId: statusCode >= 500 ? incidentId : undefined
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Aurora Platform Server (with Real-time) running on http://localhost:${PORT}`);
  AutomationScheduler.start();
  EmailWorker.start();
});
// Server reload trigger timestamp: 2026-08-17T22:30:00Z

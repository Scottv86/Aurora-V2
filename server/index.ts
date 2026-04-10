import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import dataRoutes from './routes/dataRoutes';
import platformRoutes from './routes/platformRoutes';
import publicRoutes from './routes/publicRoutes';
import { authenticate, requireSuperAdmin } from './middleware/authMiddleware';
import { requireTenantAccess } from './middleware/tenantMiddleware';
import http from 'http';
import { initSocket } from './socket';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = 3001;

// Initialize WebSockets
initSocket(httpServer);

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());

// Public Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'Aurora Platform API',
    v: '2026-04-10.3' // Version timestamp
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

// Public API Routes (Portal submissions)
app.use('/api/public', publicRoutes);

/**
 * JSON 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

/**
 * Global Error Handler
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]:', err);
  
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'System received a malformed JSON payload.' });
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Unexpected server error occurred' 
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Aurora Platform Server (with Real-time) running on http://localhost:${PORT}`);
});

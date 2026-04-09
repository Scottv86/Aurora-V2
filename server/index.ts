import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import dataRoutes from './routes/dataRoutes';
import { authenticate, requireSuperAdmin } from './middleware/authMiddleware';
import { requireTenantAccess } from './middleware/tenantMiddleware';
import http from 'http';
import { initSocket } from './socket';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;

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
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());

// Public Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'Aurora Platform API' });
});

// Registry & Auth Routes
app.use('/api/auth', authRoutes);

// Admin Registry Routes (Protected: SuperAdmin only)
app.use('/api/admin', authenticate, requireSuperAdmin, adminRoutes);

// Tenant Data Routes (Protected: Tenant Access only)
app.use('/api/data', authenticate, requireTenantAccess, dataRoutes);

httpServer.listen(PORT, () => {
  console.log(`🚀 Aurora Platform Server (with Real-time) running on http://localhost:${PORT}`);
});

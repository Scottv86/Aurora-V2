import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Global shared connection pool and adapter for the Registry.
 * Prisma 7 requires explicit adapters for database connectivity.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const globalPrisma = new PrismaClient({ adapter });

const RLS_CONTEXT = Symbol('RLS_CONTEXT');

/**
 * Returns a Prisma client scoped to a specific tenant using PostgreSQL RLS context.
 * This sets session-level variables (app.current_tenant_id, app.current_user_id)
 * within a transaction to ensure RLS policies are enforced by the database.
 */
export const getScopedPrisma = (
  tenantId: string, 
  userId: string, 
  isSuperAdmin: boolean = false,
  client: PrismaClient = globalPrisma
) => {
  const tId = tenantId || '';
  const uId = userId || '';
  const isAdmin = isSuperAdmin ? 'true' : 'false';

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Models that should be isolated by tenant_id
          const TENANT_SCOPED_MODELS = [
            'Workspace', 
            'Module', 
            'Record', 
            'DocumentTemplate', 
            'GeneratedDocument', 
            'UsageLog', 
            'TenantMember',
            'Team',
            'Agent'
          ];

          const isScopedModel = TENANT_SCOPED_MODELS.includes(model);
          const a = args as any;

          // If we are already inside our RLS transaction, just execute the query
          // But first, if it's a scoped model, inject the tenant filtering at the app level
          if (a[RLS_CONTEXT]) {
            if (isScopedModel && tId) {
              if (operation.includes('find') || operation.includes('count') || operation.includes('update') || operation.includes('delete')) {
                a.where = { ...a.where, tenantId: tId };
              }
              if (operation === 'create') {
                a.data = { ...a.data, tenantId: tId };
              }
            }
            return query(args);
          }

          // Start a transaction to set the PostgreSQL session variables
          return await (client as any).$transaction(async (tx: any) => {
            // Set session variables (SET LOCAL persists only for this transaction)
            await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tId.replace(/'/g, "''")}'`);
            await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${uId.replace(/'/g, "''")}'`);
            await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = '${isAdmin}'`);

            // Inject app-level tenant filtering for isolation insurance
            if (isScopedModel && tId) {
              if (operation.includes('find') || operation.includes('count') || operation.includes('update') || operation.includes('delete')) {
                a.where = { ...a.where, tenantId: tId };
              }
              if (operation === 'create') {
                a.data = { ...a.data, tenantId: tId };
              }
            }

            // Execute the operation on the transaction client
            const modelName = model.charAt(0).toLowerCase() + model.slice(1);
            const txModel = (tx as any)[modelName];
            
            if (txModel && typeof txModel[operation] === 'function') {
              return txModel[operation]({ ...args, [RLS_CONTEXT]: true } as any);
            }

            // Fallback to standard query if dynamic resolution fails
            return query({ ...args, [RLS_CONTEXT]: true } as any);
          });
        },
      },
    },
  });
};

export type ScopedPrismaClient = ReturnType<typeof getScopedPrisma>;

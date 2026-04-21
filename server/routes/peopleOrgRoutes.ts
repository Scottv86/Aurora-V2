import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { generateEmbedding } from '../lib/ai';
import { recordAudit } from '../lib/audit';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

// Validation Schemas
const PeopleOrgCreateSchema = z.object({
  partyType: z.enum(['PERSON', 'ORGANIZATION']),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE']).optional(),
  createdBySwarmId: z.string().uuid().optional(),
  creationContextLog: z.string().optional(),
  
  // Person fields
  person: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string().optional(),
    isHumanInLoop: z.boolean().optional(),
  }).optional(),
  
  // Organization fields
  organization: z.object({
    legalName: z.string(),
    orgStructureType: z.string(),
    incorporationDate: z.string().optional(),
    taxIdentifier: z.string().optional(),
  }).optional(),
});

// GET Global People & Organisation Directory
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { search, status } = req.query;
    
    // Base query
    const where: any = {
      tenantId: req.tenantId,
    };
    
    if (status) {
      where.status = status;
    }
    
    // If semantic search is implemented, we'd use pgvector here
    // For now, standard filter
    const parties = await db.party.findMany({
      where,
      include: {
        person: true,
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(parties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Single Person/Organisation
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    
    const party = await db.party.findUnique({
      where: { id, tenantId: req.tenantId },
      include: {
        person: true,
        organization: true,
      }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(party);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create Person/Organisation (with Deduplication Guardrail)
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const body = PeopleOrgCreateSchema.parse(req.body);
    
    // 1. Semantic Deduplication Guardrail
    const identifier = body.partyType === 'PERSON' 
      ? `${body.person?.firstName} ${body.person?.lastName}`
      : body.organization?.legalName;
      
    const embedding = await generateEmbedding(identifier || '');
    
    // Check for similarities using raw SQL since Prisma doesn't support vector operators in findMany yet
    // Similarity threshold 0.9
    const vectorString = `[${embedding.join(',')}]`;
    const similarParties: any[] = await (db as any).$queryRaw`
      SELECT id, status 
      FROM parties 
      WHERE tenant_id = ${req.tenantId} 
      AND embeddings <=> ${vectorString}::vector < 0.1
      LIMIT 1
    `;
    
    if (similarParties.length > 0) {
      return res.status(409).json({
        error: 'Semantic match detected. Record may already exist.',
        existingPartyId: similarParties[0].id,
      });
    }

    // 2. Default status for Swarm creation
    let status = body.status || 'ACTIVE';
    if (body.createdBySwarmId) {
      status = 'PENDING_REVIEW';
    }
    
    // 3. Create Party and extension
    const partyData: any = {
      tenantId: req.tenantId!,
      partyType: body.partyType,
      status: status,
      createdBySwarmId: body.createdBySwarmId,
      creationContextLog: body.creationContextLog,
      // Store embedding as binary or via raw SQL cast if needed
      // Prisma Unsupported type handling
    };

    const newParty = await db.party.create({
      data: {
        ...partyData,
        person: body.partyType === 'PERSON' ? {
          create: {
            firstName: body.person!.firstName,
            lastName: body.person!.lastName,
            dateOfBirth: body.person!.dateOfBirth ? new Date(body.person!.dateOfBirth) : null,
            isHumanInLoop: body.person!.isHumanInLoop || false,
          }
        } : undefined,
        organization: body.partyType === 'ORGANIZATION' ? {
          create: {
            legalName: body.organization!.legalName,
            orgStructureType: body.organization!.orgStructureType,
            incorporationDate: body.organization!.incorporationDate ? new Date(body.organization!.incorporationDate) : null,
            taxIdentifier: body.organization!.taxIdentifier,
          }
        } : undefined,
      },
      include: { person: true, organization: true }
    });

    // Update embedding separately since Prisma Unsupported is tricky to set on create
    await (db as any).$executeRaw`
      UPDATE parties 
      SET embeddings = ${vectorString}::vector 
      WHERE id = ${newParty.id}
    `;

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_CREATE',
      resourceId: newParty.id,
      newValue: newParty
    });

    res.status(201).json(newParty);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET Pending Approvals
router.get('/approvals', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const pending = await db.party.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING_REVIEW'
      },
      include: {
        person: true,
        organization: true
      }
    });
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH Approve Person/Organisation
router.patch('/:id/approve', authorize('manage:people-organisations'), async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    
    const updated = await db.party.update({
      where: { id, tenantId: req.tenantId },
      data: { status: 'ACTIVE' },
      include: { person: true, organization: true }
    });
    
    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'PEOPLE_ORG_APPROVE',
      resourceId: id,
      newValue: updated
    });
    
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Relationships API
router.get('/:id/relationships', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    
    const relationships = await db.partyRelationship.findMany({
      where: {
        tenantId: req.tenantId,
        OR: [
          { sourcePartyId: id },
          { targetPartyId: id }
        ]
      },
      include: {
        sourceParty: { include: { person: true, organization: true } },
        targetParty: { include: { person: true, organization: true } }
      }
    });
    
    res.json(relationships);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT Update Person/Organisation
router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    const body = PeopleOrgCreateSchema.partial().parse(req.body);
    
    // 1. Fetch existing
    const existing = await db.party.findUnique({
      where: { id, tenantId: req.tenantId },
      include: { person: true, organization: true }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // 2. Update Party and extension
    const updated = await db.party.update({
      where: { id },
      data: {
        status: body.status || existing.status,
        person: existing.partyType === 'PERSON' && body.person ? {
          update: {
            firstName: body.person.firstName,
            lastName: body.person.lastName,
            dateOfBirth: body.person.dateOfBirth ? new Date(body.person.dateOfBirth) : undefined,
            isHumanInLoop: body.person.isHumanInLoop,
          }
        } : undefined,
        organization: existing.partyType === 'ORGANIZATION' && body.organization ? {
          update: {
            legalName: body.organization.legalName,
            orgStructureType: body.organization.orgStructureType,
            incorporationDate: body.organization.incorporationDate ? new Date(body.organization.incorporationDate) : undefined,
            taxIdentifier: body.organization.taxIdentifier,
          }
        } : undefined,
      },
      include: { person: true, organization: true }
    });
    
    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_UPDATE',
      resourceId: id,
      oldValue: existing,
      newValue: updated
    });
    
    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE Person/Organisation
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    
    // RLS will ensure we can only delete if it belongs to current tenant
    await db.party.delete({
      where: { id, tenantId: req.tenantId }
    });
    
    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PEOPLE_ORG_DELETE',
      resourceId: id
    });
    
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const RelationshipCreateSchema = z.object({
  targetPartyId: z.string(),
  relationshipType: z.string(),
  ownershipPercentage: z.number().optional().nullable(),
  validFrom: z.string().optional().nullable()
});

router.post('/:id/relationships', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id: sourcePartyId } = req.params;
    const body = RelationshipCreateSchema.parse(req.body);

    const relationship = await db.partyRelationship.create({
      data: {
        tenantId: req.tenantId!,
        sourcePartyId,
        targetPartyId: body.targetPartyId,
        relationshipType: body.relationshipType,
        ownershipPercentage: body.ownershipPercentage,
        validFrom: body.validFrom ? new Date(body.validFrom) : new Date()
      },
      include: {
        targetParty: {
          include: { person: true, organization: true }
        }
      }
    });

    await recordAudit(req, 'CREATE_RELATIONSHIP', 'PARTY', relationship.id, { 
      sourcePartyId, 
      targetPartyId: body.targetPartyId,
      relationshipType: body.relationshipType
    });

    res.status(201).json(relationship);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;

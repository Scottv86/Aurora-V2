import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

const getSolutionModel = (db: any) => db?.solutionBlueprint || db?.SolutionBlueprint || globalPrisma.solutionBlueprint;

// GET /api/solutions - List all solution blueprints for active tenant
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    let solutions = [];
    if (model) {
      const rawSolutions = await model.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' }
      });
      solutions = rawSolutions.map((sol: any) => {
        const modules = Array.isArray(sol.connectedModules) ? sol.connectedModules : [];
        const artifacts = Array.isArray(sol.artifacts) ? sol.artifacts : [];
        const chat = Array.isArray(sol.chatMessages) ? sol.chatMessages : Array.isArray(sol.chatHistory) ? sol.chatHistory : [];

        let description = sol.description;
        if (!description || description.includes('linked data modules') || description.includes('Solution Blueprint combining')) {
          const specArt = artifacts.find((a: any) => a.type === 'PAGE' || (a.id && a.id.startsWith('art_spec_')));
          description = specArt?.description || (specArt?.content as any)?.title || (sol.name ? `Enterprise solution blueprint for ${sol.name}` : 'Enterprise Solution Blueprint');
        }

        return {
          ...sol,
          description,
          chatHistory: chat,
          chatMessages: chat,
          modulesCount: sol.modulesCount ?? modules.length,
          workflowsCount: sol.workflowsCount ?? artifacts.filter((a: any) => a.type === 'WORKFLOW').length,
          formsCount: sol.formsCount ?? artifacts.filter((a: any) => a.type === 'FORM').length,
          artifactsCount: sol.artifactsCount ?? artifacts.length,
          metricsCount: sol.metricsCount ?? artifacts.filter((a: any) => a.type === 'METRIC' || a.type === 'KPI').length,
          brandsCount: sol.brandsCount ?? artifacts.filter((a: any) => a.type === 'BRAND').length,
          searchesCount: sol.searchesCount ?? artifacts.filter((a: any) => a.type === 'SEARCH').length
        };
      });
    }

    res.json({ solutions });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET / Error:', err);
    res.status(500).json({ error: 'Failed to load solution blueprints.' });
  }
});

// GET /api/solutions/:id - Get specific solution blueprint detail
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const sol = await model.findFirst({
      where: { id, tenantId }
    });

    if (!sol) {
      return res.status(404).json({ error: 'Solution blueprint not found' });
    }

    const chat = Array.isArray(sol.chatMessages) ? sol.chatMessages : Array.isArray(sol.chatHistory) ? sol.chatHistory : [];
    res.json({
      ...sol,
      chatHistory: chat,
      chatMessages: chat
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET /:id Error:', err);
    res.status(500).json({ error: 'Failed to fetch solution blueprint details' });
  }
});

// POST /api/solutions - Create or update a solution blueprint in database
router.post('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);
    const body = req.body;

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const solutionId = body.id || `sol_${Date.now()}`;

    const upserted = await model.upsert({
      where: { id: solutionId },
      update: {
        name: body.name || 'New Enterprise Solution',
        description: body.description || '',
        category: body.category || 'General',
        version: body.version || '1.0.0',
        status: body.status || 'DRAFT',
        author: body.author || 'Platform User',
        activeArtifactId: body.activeArtifactId || undefined,
        contextSources: body.contextSources || [],
        connectedModules: body.connectedModules || [],
        artifacts: body.artifacts || [],
        savedNotes: body.savedNotes || [],
        chatMessages: body.chatMessages || body.chatHistory || [],
        metadata: body.metadata || {}
      },
      create: {
        id: solutionId,
        tenantId,
        name: body.name || 'New Enterprise Solution',
        description: body.description || '',
        category: body.category || 'General',
        version: body.version || '1.0.0',
        status: body.status || 'DRAFT',
        author: body.author || 'Platform User',
        activeArtifactId: body.activeArtifactId || undefined,
        contextSources: body.contextSources || [],
        connectedModules: body.connectedModules || [],
        artifacts: body.artifacts || [],
        savedNotes: body.savedNotes || [],
        chatMessages: body.chatMessages || body.chatHistory || [],
        metadata: body.metadata || {}
      }
    });

    res.status(201).json(upserted);
  } catch (err: any) {
    console.error('[SolutionRoutes] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save solution blueprint' });
  }
});

// DELETE /api/solutions/:id - Delete solution blueprint from database
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (model) {
      await model.deleteMany({
        where: { id, tenantId }
      });
    }

    res.json({ success: true, message: `Solution blueprint ${id} removed.` });
  } catch (err: any) {
    console.error('[SolutionRoutes] DELETE /:id Error:', err);
    res.status(500).json({ error: 'Failed to delete solution blueprint' });
  }
});

// POST /api/solutions/:id/deploy - Real Workspace End-to-End Solution Provisioner Runner
router.post('/:id/deploy', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    const blueprint = await model?.findFirst({ where: { id, tenantId } });
    if (!blueprint) {
      return res.status(404).json({ error: 'Solution blueprint not found for deployment.' });
    }

    const artifacts = Array.isArray(blueprint.artifacts) ? blueprint.artifacts : [];
    const provisionedResources: string[] = [];

    // 1. Provision Global Picklists (GlobalList Table)
    const picklistArtifacts = artifacts.filter((a: any) => a.type === 'GLOBAL_LIST');
    for (const pArt of picklistArtifacts) {
      try {
        const options = pArt.content?.options || ['Standard Support', 'Enterprise SLA'];
        if (db.globalList) {
          await db.globalList.upsert({
            where: { id: `glist_${pArt.id}` },
            update: { name: pArt.name, values: options },
            create: { id: `glist_${pArt.id}`, tenantId, name: pArt.name, category: 'General', values: options }
          });
          provisionedResources.push(`Global Picklist: ${pArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Picklist error for ${pArt.name}:`, e);
      }
    }

    // 2. Provision Forms (Form Table)
    const formArtifacts = artifacts.filter((a: any) => a.type === 'FORM');
    for (const fArt of formArtifacts) {
      try {
        if (db.form) {
          await db.form.upsert({
            where: { id: `form_${fArt.id}` },
            update: { name: fArt.name, schema: fArt.content },
            create: { id: `form_${fArt.id}`, tenantId, name: fArt.name, status: 'PUBLISHED', schema: fArt.content }
          });
          provisionedResources.push(`Interactive Form: ${fArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Form error for ${fArt.name}:`, e);
      }
    }

    // 3. Provision Workflows (Workflow Table)
    const flowArtifacts = artifacts.filter((a: any) => a.type === 'WORKFLOW');
    for (const wArt of flowArtifacts) {
      try {
        if (db.workflow) {
          await db.workflow.upsert({
            where: { id: `flow_${wArt.id}` },
            update: { name: wArt.name, graph: wArt.content },
            create: { id: `flow_${wArt.id}`, tenantId, name: wArt.name, status: 'ACTIVE', graph: wArt.content }
          });
          provisionedResources.push(`Process Workflow: ${wArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Workflow error for ${wArt.name}:`, e);
      }
    }

    // 4. Provision Autonomous AI Agents (Digital Coworkers)
    const agentArtifacts = artifacts.filter((a: any) => a.type === 'AGENT');
    for (const aArt of agentArtifacts) {
      try {
        const agentConfig = aArt.content || {};
        const agentName = aArt.name || agentConfig.name || 'Autonomous Solution Copilot';
        const role = agentConfig.roleTitle || agentConfig.workforceMapping?.role || 'Digital Coworker';
        const modelType = agentConfig.modelConfig?.model || 'gemini-2.5-flash';
        
        let agentRecord: any = null;
        if (db.agent) {
          agentRecord = await db.agent.create({
            data: {
              tenantId,
              name: agentName,
              modelType,
              config: agentConfig
            }
          });
        }

        if (db.tenantMember) {
          await db.tenantMember.create({
            data: {
              tenantId,
              agentId: agentRecord?.id || null,
              firstName: agentName.split(' ')[0] || 'AI',
              familyName: agentName.split(' ').slice(1).join(' ') || 'Copilot',
              roleId: role,
              status: 'Active',
              isSynthetic: true,
              licenceType: agentConfig.workforceMapping?.licenceType || 'AI Agent Seat',
              avatarUrl: agentConfig.avatarUrl || null,
              agentConfig: agentConfig
            }
          });
        }
        provisionedResources.push(`AI Digital Coworker: ${agentName}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] Agent error for ${aArt.name}:`, e);
      }
    }
    // 5. Provision Semantic Metrics & KPIs (KpiDefinition Table)
    const metricArtifacts = artifacts.filter((a: any) => a.type === 'METRIC' || a.type === 'KPI');
    for (const mArt of metricArtifacts) {
      try {
        const mConfig = mArt.content || {};
        if (db.kpiDefinition) {
          await db.kpiDefinition.upsert({
            where: { id: `kpi_${mArt.id}` },
            update: {
              name: mArt.name,
              category: mConfig.category || 'Operations',
              sourceType: mConfig.sourceType || 'module_record',
              sourceConfig: mConfig.sourceConfig || {},
              format: mConfig.format || 'percentage',
              targetValue: typeof mConfig.targetValue === 'number' ? mConfig.targetValue : null,
              thresholds: mConfig.thresholds || [],
              status: 'ACTIVE'
            },
            create: {
              id: `kpi_${mArt.id}`,
              tenantId,
              name: mArt.name,
              slug: mConfig.slug || mArt.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              description: mArt.description || mConfig.description || '',
              category: mConfig.category || 'Operations',
              tags: mConfig.tags || ['solution', 'kpi'],
              iconName: mConfig.iconName || 'Target',
              sourceType: mConfig.sourceType || 'module_record',
              sourceConfig: mConfig.sourceConfig || {},
              format: mConfig.format || 'percentage',
              formatOptions: mConfig.formatOptions || {},
              trendDirection: mConfig.trendDirection || 'higher_is_better',
              targetValue: typeof mConfig.targetValue === 'number' ? mConfig.targetValue : null,
              thresholds: mConfig.thresholds || [],
              timeHorizon: mConfig.timeHorizon || 'trailing_30d',
              isGlobal: false,
              status: 'ACTIVE',
              cacheTtlSeconds: 300
            }
          });
        }
        provisionedResources.push(`Semantic Metric: ${mArt.name}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] Metric error for ${mArt.name}:`, e);
      }
    }

    // 6. Provision Content & Document Templates (DocumentTemplate Table)
    const contentArtifacts = artifacts.filter((a: any) => a.type === 'CONTENT' || a.type === 'TEMPLATE');
    for (const cArt of contentArtifacts) {
      try {
        const cContent = cArt.content || {};
        if (db.documentTemplate) {
          await db.documentTemplate.upsert({
            where: { id: `tmpl_${cArt.id}` },
            update: {
              name: cArt.name,
              type: cContent.type || 'letter',
              description: cArt.description || '',
              content: typeof cContent === 'string' ? cContent : (cContent.content || ''),
              blocks: cContent.blocks || [],
              metadata: cContent.metadata || {},
              status: 'Published'
            },
            create: {
              id: `tmpl_${cArt.id}`,
              tenantId,
              name: cArt.name,
              type: cContent.type || 'letter',
              description: cArt.description || '',
              content: typeof cContent === 'string' ? cContent : (cContent.content || ''),
              blocks: cContent.blocks || [],
              metadata: cContent.metadata || {},
              status: 'Published',
              createdBy: 'SolutionDeployer'
            }
          });
        }
        provisionedResources.push(`Content Template: ${cArt.name}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] Content error for ${cArt.name}:`, e);
      }
    }

    // 7. Provision Brand Identities (BrandKit Table)
    const brandArtifacts = artifacts.filter((a: any) => a.type === 'BRAND');
    for (const bArt of brandArtifacts) {
      try {
        const bContent = bArt.content || {};
        const brandKitModel: any = (db as any).brandKit || globalPrisma.brandKit;
        if (brandKitModel) {
          const brandSlug = bContent.slug || bArt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `brand-${bArt.id}`;
          const brandData = {
            name: bArt.name || bContent.name || 'Brand Identity',
            slug: brandSlug,
            description: bArt.description || bContent.description || 'Enterprise Brand Kit provisioned by Solution Builder',
            isDefault: Boolean(bContent.isDefault),
            assets: bContent.assets || {},
            colors: bContent.colors || {
              primary: '#6366f1',
              secondary: '#4f46e5',
              accent: '#ec4899',
              background: '#ffffff',
              surface: '#f8fafc',
              text: '#0f172a',
              muted: '#64748b',
              border: '#e2e8f0',
              chartPalette: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
            },
            typography: bContent.typography || {
              headingFont: 'Plus Jakarta Sans',
              bodyFont: 'Inter',
              monoFont: 'JetBrains Mono',
              fontSizeScale: 'medium'
            },
            styling: bContent.styling || {
              borderRadius: '12px',
              buttonStyle: 'rounded',
              elevation: 'subtle',
              headerLayout: 'top_right',
              navLinkStyle: 'underline'
            },
            voiceAndTone: bContent.voiceAndTone || {
              tone: 'Professional & Modern',
              boilerplate: `${bArt.name} delivers modern workflows and platform excellence.`,
              tagline: 'Modern Platform Excellence',
              prohibitedWords: ['synergy', 'disruptive'],
              audiencePersona: 'Enterprise operators and stakeholders'
            },
            emailDefaults: bContent.emailDefaults || {
              signatureTemplate: 'standard',
              disclaimer: 'This email is confidential and intended solely for the recipient.',
              socialLinks: {}
            },
            metadata: {
              ...(bContent.metadata || {}),
              provisionedBySolution: id,
              artifactId: bArt.id
            }
          };

          const existing = await brandKitModel.findFirst({
            where: { tenantId, OR: [{ id: `brand_${bArt.id}` }, { slug: brandSlug }] }
          });

          if (existing) {
            await brandKitModel.update({
              where: { id: existing.id },
              data: brandData
            });
          } else {
            await brandKitModel.create({
              data: {
                id: `brand_${bArt.id}`,
                tenantId,
                ...brandData
              }
            });
          }
          provisionedResources.push(`Brand Kit: ${bArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Brand Kit error for ${bArt.name}:`, e);
      }
    }

    // 8. Provision Federated Searches (SavedQuery Table with isSearchEnabled = true)
    const searchArtifacts = artifacts.filter((a: any) => a.type === 'SEARCH');
    for (const sArt of searchArtifacts) {
      try {
        const sContent = sArt.content || {};
        const queryModel: any = (db as any).savedQuery || globalPrisma.savedQuery;
        if (queryModel) {
          const searchSlug = sContent.slug || sArt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `search-${sArt.id}`;
          const searchData = {
            name: sArt.name || sContent.name || 'Federated Search',
            slug: searchSlug,
            description: sArt.description || sContent.description || 'Federated cross-module search provisioned by Solution Builder',
            category: sContent.category || 'Operations',
            tags: Array.isArray(sContent.tags) ? sContent.tags : ['solution', 'search'],
            iconName: sContent.iconName || 'Search',
            isSearchEnabled: true,
            scopeType: sContent.scopeType || 'MULTI_MODULE',
            targetModuleIds: Array.isArray(sContent.targetModuleIds) ? sContent.targetModuleIds : [],
            searchConfig: sContent.searchConfig || {},
            allowedRoleIds: Array.isArray(sContent.allowedRoleIds) ? sContent.allowedRoleIds : [],
            sql: sContent.sql || '',
            parameters: Array.isArray(sContent.parameters) ? sContent.parameters : [],
            columnsConfig: Array.isArray(sContent.columnsConfig) ? sContent.columnsConfig : [],
            status: sContent.status || 'PUBLISHED',
            cacheTtlSeconds: typeof sContent.cacheTtlSeconds === 'number' ? sContent.cacheTtlSeconds : 0
          };

          const existing = await queryModel.findFirst({
            where: { tenantId, OR: [{ id: `search_${sArt.id}` }, { slug: searchSlug }] }
          });

          if (existing) {
            await queryModel.update({
              where: { id: existing.id },
              data: {
                ...searchData,
                updatedAt: new Date()
              }
            });
          } else {
            await queryModel.create({
              data: {
                id: `search_${sArt.id}`,
                tenantId,
                ...searchData
              }
            });
          }
          provisionedResources.push(`Federated Search: ${sArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Saved Search error for ${sArt.name}:`, e);
      }
    }

    // 9. Provision Saved Queries (SavedQuery Table with isSearchEnabled = false)
    const queryArtifacts = artifacts.filter((a: any) => a.type === 'QUERY');
    for (const qArt of queryArtifacts) {
      try {
        const qContent = qArt.content || {};
        const queryModel: any = (db as any).savedQuery || globalPrisma.savedQuery;
        if (queryModel) {
          const querySlug = (qArt.name || `query-${qArt.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const queryData = {
            name: qArt.name,
            slug: querySlug,
            description: qArt.description || qContent.description || 'Saved SQL query provisioned by Solution Builder',
            category: qContent.category || 'Analytics',
            tags: Array.isArray(qContent.tags) ? qContent.tags : ['solution', 'query'],
            iconName: qContent.iconName || 'Database',
            isSearchEnabled: false,
            scopeType: qContent.scopeType || 'MULTI_MODULE',
            sql: qContent.sql || `SELECT * FROM data_records WHERE tenant_id = '${tenantId}' LIMIT 50;`,
            status: 'PUBLISHED',
            parameters: qContent.parameters || [],
            columnsConfig: qContent.columnsConfig || []
          };

          const existing = await queryModel.findFirst({
            where: { tenantId, OR: [{ id: `query_${qArt.id}` }, { slug: querySlug }] }
          });

          if (existing) {
            await queryModel.update({
              where: { id: existing.id },
              data: { ...queryData, updatedAt: new Date() }
            });
          } else {
            await queryModel.create({
              data: { id: `query_${qArt.id}`, tenantId, ...queryData }
            });
          }
          provisionedResources.push(`Saved Query: ${qArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Saved Query error for ${qArt.name}:`, e);
      }
    }

    // 10. Provision Automations (Automation Table)
    const automationArtifacts = artifacts.filter((a: any) => a.type === 'AUTOMATION');
    for (const autArt of automationArtifacts) {
      try {
        const autContent = autArt.content || {};
        const autModel: any = (db as any).automation || globalPrisma.automation;
        if (autModel) {
          await autModel.upsert({
            where: { id: `aut_${autArt.id}` },
            update: {
              name: autArt.name,
              description: autArt.description || autContent.description,
              actions: autContent.actions || [],
              triggers: autContent.triggers || [],
              isActive: true,
              status: 'PUBLISHED'
            },
            create: {
              id: `aut_${autArt.id}`,
              tenantId,
              name: autArt.name,
              description: autArt.description || autContent.description || 'Automation pipeline provisioned by Solution Builder',
              actions: autContent.actions || [],
              triggers: autContent.triggers || [],
              isActive: true,
              status: 'PUBLISHED'
            }
          });
          provisionedResources.push(`Automation Pipeline: ${autArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Automation error for ${autArt.name}:`, e);
      }
    }

    // 11. Provision BI Reports (Report Table)
    const reportArtifacts = artifacts.filter((a: any) => a.type === 'REPORT');
    for (const rArt of reportArtifacts) {
      try {
        const rContent = rArt.content || {};
        const reportModel: any = (db as any).report || globalPrisma.report;
        if (reportModel) {
          const reportConfig = rContent.config || rContent || { widgets: [], dataSource: { type: 'local', tables: ['records'] } };
          await reportModel.upsert({
            where: { id: `rep_${rArt.id}` },
            update: {
              name: rArt.name,
              description: rArt.description || rContent.description,
              config: reportConfig,
              status: 'Published'
            },
            create: {
              id: `rep_${rArt.id}`,
              tenantId,
              name: rArt.name,
              description: rArt.description || rContent.description || 'BI Report provisioned by Solution Builder',
              config: reportConfig,
              status: 'Published'
            }
          });
          provisionedResources.push(`BI Report: ${rArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Report error for ${rArt.name}:`, e);
      }
    }

    // 12. Provision Sites & Portals (Site Table)
    const siteArtifacts = artifacts.filter((a: any) => a.type === 'SITE');
    for (const sArt of siteArtifacts) {
      try {
        const sContent = sArt.content || {};
        const siteModel: any = (db as any).site || globalPrisma.site;
        if (siteModel) {
          const siteDomain = (sContent.domain || `${(sArt.name || 'portal').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.aurora.app`);
          await siteModel.upsert({
            where: { id: `site_${sArt.id}` },
            update: {
              name: sArt.name,
              description: sArt.description || sContent.description,
              domain: siteDomain,
              category: sContent.category || 'internal',
              type: sContent.type || 'Customer Portal',
              status: 'active',
              access: sContent.access || 'Public'
            },
            create: {
              id: `site_${sArt.id}`,
              tenantId,
              name: sArt.name,
              description: sArt.description || sContent.description || 'Portal provisioned by Solution Builder',
              domain: siteDomain,
              category: sContent.category || 'internal',
              type: sContent.type || 'Customer Portal',
              status: 'active',
              access: sContent.access || 'Public',
              branding: sContent.branding || {}
            }
          });
          provisionedResources.push(`Site / Portal: ${sArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Site error for ${sArt.name}:`, e);
      }
    }

    // 13. Provision Work Queues (Tenant Workspace Queues)
    const queueArtifacts = artifacts.filter((a: any) => a.type === 'QUEUE');
    if (queueArtifacts.length > 0) {
      try {
        const tenantRecord = await globalPrisma.tenant.findUnique({
          where: { id: tenantId },
          select: { workspaceSettings: true }
        });
        const currentSettings = (tenantRecord?.workspaceSettings as any) || {};
        const existingQueues: any[] = Array.isArray(currentSettings.queues) ? [...currentSettings.queues] : [];

        for (const qArt of queueArtifacts) {
          const qContent = qArt.content || {};
          const newQueue = {
            id: `queue_${qArt.id}`,
            name: qArt.name,
            description: qArt.description || qContent.description || 'Work queue provisioned by Solution Builder',
            moduleId: qContent.moduleId || '',
            moduleIds: qContent.moduleIds || [],
            isUnifiedQueue: Boolean(qContent.isUnifiedQueue),
            columns: qContent.columns || [],
            conditions: qContent.conditions || { rules: [] },
            slaConfig: qContent.slaConfig || null,
            createdAt: new Date().toISOString()
          };

          const qIndex = existingQueues.findIndex(q => q.id === newQueue.id);
          if (qIndex >= 0) {
            existingQueues[qIndex] = { ...existingQueues[qIndex], ...newQueue };
          } else {
            existingQueues.push(newQueue);
          }
          provisionedResources.push(`Work Queue: ${qArt.name}`);
        }

        await globalPrisma.tenant.update({
          where: { id: tenantId },
          data: {
            workspaceSettings: {
              ...currentSettings,
              queues: existingQueues
            }
          }
        });
      } catch (e) {
        console.warn(`[SolutionDeployer] Queue provisioning error:`, e);
      }
    }

    // 14. Update Blueprint Status to PUBLISHED
    await model.update({
      where: { id },
      data: { status: 'PUBLISHED' }
    });

    res.json({
      success: true,
      blueprintId: id,
      solutionName: blueprint.name,
      message: `Solution Blueprint "${blueprint.name}" successfully provisioned into workspace.`,
      provisionedResources,
      deployedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/deploy Error:', err);
    res.status(500).json({ error: err.message || 'Failed to deploy solution blueprint into workspace.' });
  }
});

export default router;


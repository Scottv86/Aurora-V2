import { Router } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { encryptSecret, decryptSecret, generateKeyHint } from '../lib/crypto';
import { PROVIDER_PRICING, calculateEstimatedCost } from '../services/aiProviderService';
import { GoogleGenAI } from '@google/genai';

const router = Router();

const getKeyModel = (client: any) => client?.tenantAIKey || client?.tenantAiKey || client?.TenantAIKey;
const getMappingModel = (client: any) => client?.tenantAIMapping || client?.tenantAiMapping || client?.TenantAIMapping;
const getMetricModel = (client: any) => client?.aiUsageMetric || client?.aIUsageMetric || client?.AIUsageMetric;

// GET all BYOK API keys for a tenant
router.get('/keys', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;

    const keyModel = getKeyModel(db) || getKeyModel(globalPrisma);
    if (!keyModel) {
      return res.json([]);
    }

    const keys = await keyModel.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        alias: true,
        keyHint: true,
        baseUrl: true,
        apiExtraConfig: true,
        isDefault: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(keys);
  } catch (err: any) {
    console.error('[AISettingsRoutes] GET /keys Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch API keys' });
  }
});

// POST save or update a BYOK API key
router.post('/keys', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { provider, apiKey, alias, keyName, baseUrl, apiExtraConfig, isDefault } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API Key are required' });
    }

    const normalizedProvider = provider.toLowerCase();
    const aliasName = alias || keyName || `${normalizedProvider.toUpperCase()} Key`;

    // Encrypt key
    const { encryptedKey, keyHint } = encryptSecret(apiKey);

    const keyModel = getKeyModel(db) || getKeyModel(globalPrisma);
    if (!keyModel) {
      return res.status(500).json({ error: 'TenantAIKey model is not initialized in Prisma Client.' });
    }

    if (isDefault) {
      await keyModel.updateMany({
        where: { tenantId, provider: normalizedProvider },
        data: { isDefault: false }
      });
    }

    const keyRecord = await keyModel.create({
      data: {
        tenantId,
        provider: normalizedProvider,
        alias: aliasName,
        encryptedKey,
        keyHint,
        baseUrl: baseUrl || null,
        apiExtraConfig: apiExtraConfig || null,
        isDefault: isDefault ?? true,
        status: 'active'
      },
      select: {
        id: true,
        provider: true,
        alias: true,
        keyHint: true,
        baseUrl: true,
        apiExtraConfig: true,
        isDefault: true,
        status: true,
        createdAt: true
      }
    });

    res.json(keyRecord);
  } catch (err: any) {
    console.error('[AISettingsRoutes] POST /keys Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save API Key' });
  }
});

// DELETE a BYOK API Key
router.delete('/keys/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const keyModel = getKeyModel(db) || getKeyModel(globalPrisma);
    if (!keyModel) {
      return res.status(500).json({ error: 'TenantAIKey model is not initialized in Prisma Client.' });
    }

    await keyModel.deleteMany({
      where: { id, tenantId }
    });

    res.json({ success: true, message: 'Key removed successfully' });
  } catch (err: any) {
    console.error('[AISettingsRoutes] DELETE /keys/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete API Key' });
  }
});

// POST test connectivity for an API Key
router.post('/keys/test', async (req: TenantRequest, res) => {
  try {
    const { provider, apiKey, baseUrl } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key is required for testing' });
    }

    const db = req.db || globalPrisma;
    const keyModel = getKeyModel(db) || getKeyModel(globalPrisma);

    let rawKey = apiKey;
    let targetBaseUrl = baseUrl;

    if (keyModel && typeof apiKey === 'string') {
      try {
        const storedKeyRecord = await keyModel.findFirst({
          where: { id: apiKey }
        });
        if (storedKeyRecord) {
          rawKey = decryptSecret(storedKeyRecord.encryptedKey);
          if (!targetBaseUrl && storedKeyRecord.baseUrl) {
            targetBaseUrl = storedKeyRecord.baseUrl;
          }
        }
      } catch (e) {}
    }

    if (rawKey.includes(':')) {
      // It's an encrypted stored key ID or payload
      try {
        rawKey = decryptSecret(rawKey);
      } catch (e) {}
    }

    const targetProvider = (provider || 'google').toLowerCase();

    if (targetProvider === 'google') {
      const ai = new GoogleGenAI({ apiKey: rawKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: 'ping'
        });
      } catch (e1: any) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'ping'
          });
        } catch (e2: any) {
          response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: 'ping'
          });
        }
      }
      if (response && response.text) {
        return res.json({ success: true, message: 'Successfully connected to Google Gemini API' });
      }
    } else if (
      targetProvider === 'openai' || 
      targetProvider === 'xai' || 
      targetProvider === 'deepseek' || 
      targetProvider === 'ollama' || 
      targetProvider === 'groq' || 
      targetProvider === 'openrouter'
    ) {
      const defaultEndpoint = 
        targetProvider === 'xai' ? 'https://api.x.ai/v1' : 
        targetProvider === 'deepseek' ? 'https://api.deepseek.com/v1' : 
        targetProvider === 'groq' ? 'https://api.groq.com/openai/v1' : 
        targetProvider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 
        'https://api.openai.com/v1';
      const endpoint = targetBaseUrl || baseUrl || defaultEndpoint;
      const response = await fetch(`${endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${rawKey}`
        }
      });
      if (response.ok || response.status === 200 || response.status === 401) {
        if (response.status === 401) {
          return res.status(400).json({ success: false, error: 'Invalid API Key' });
        }
        return res.json({ success: true, message: `Successfully connected to ${targetProvider.toUpperCase()} endpoint` });
      }
    } else if (targetProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': rawKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }]
        })
      });
      if (response.ok || response.status === 200) {
        return res.json({ success: true, message: 'Successfully connected to Anthropic API' });
      }
    }

    res.json({ success: true, message: `Key format accepted for ${targetProvider.toUpperCase()}` });
  } catch (err: any) {
    console.error('[AISettingsRoutes] POST /keys/test Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Connection test failed' });
  }
});

// GET AI Config & Tier Mappings
router.get('/config', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;

    const mappingModel = getMappingModel(db) || getMappingModel(globalPrisma);
    if (!mappingModel) {
      return res.json({
        lowModel: 'gemini-3.5-flash',
        mediumModel: 'claude-sonnet-4.6',
        highModel: 'gpt-5.6-sol',
        zeroDataRetention: true,
        piiRedaction: false,
        allowLocalOnly: false
      });
    }

    let mapping = await mappingModel.findUnique({
      where: { tenantId }
    });

    if (!mapping) {
      mapping = await mappingModel.create({
        data: { tenantId }
      });
    }

    res.json(mapping);
  } catch (err: any) {
    console.error('[AISettingsRoutes] GET /config Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch AI configuration' });
  }
});

// PUT update AI Config & Tier Mappings
router.put('/config', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { lowModel, mediumModel, highModel, zeroDataRetention, piiRedaction, allowLocalOnly } = req.body;

    const mappingModel = getMappingModel(db) || getMappingModel(globalPrisma);
    if (!mappingModel) {
      return res.status(500).json({ error: 'TenantAIMapping model is not initialized in Prisma Client.' });
    }

    const mapping = await mappingModel.upsert({
      where: { tenantId },
      update: {
        ...(lowModel !== undefined && { lowModel }),
        ...(mediumModel !== undefined && { mediumModel }),
        ...(highModel !== undefined && { highModel }),
        ...(zeroDataRetention !== undefined && { zeroDataRetention }),
        ...(piiRedaction !== undefined && { piiRedaction }),
        ...(allowLocalOnly !== undefined && { allowLocalOnly })
      },
      create: {
        tenantId,
        lowModel: lowModel || 'gemini-3.5-flash',
        mediumModel: mediumModel || 'claude-sonnet-4.6',
        highModel: highModel || 'gpt-5.6-sol',
        zeroDataRetention: zeroDataRetention ?? true,
        piiRedaction: piiRedaction ?? false,
        allowLocalOnly: allowLocalOnly ?? false
      }
    });

    res.json(mapping);
  } catch (err: any) {
    console.error('[AISettingsRoutes] PUT /config Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update AI configuration' });
  }
});

// GET AI Usage & Telemetry Metrics
router.get('/usage', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;

    const metricModel = getMetricModel(db) || getMetricModel(globalPrisma);
    if (!metricModel) {
      return res.json({
        summary: { totalRequests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, estimatedCostUSD: 0 },
        rollingLimits: {
          fiveHour: { tokensUsed: 0, requestsUsed: 0, tokenBudget: 250000, percentage: 0, resetHours: 5 },
          sevenDay: { tokensUsed: 0, requestsUsed: 0, tokenBudget: 5000000, percentage: 0, resetDays: 7 }
        },
        recentMetrics: [],
        pricingCatalog: PROVIDER_PRICING
      });
    }

    const metrics = await metricModel.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    const aggregate = await metricModel.aggregate({
      where: { tenantId },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true
      },
      _count: {
        id: true
      }
    });

    // Calculate Rolling Limits (5-Hour Window and 7-Day Window)
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [fiveHourAgg, sevenDayAgg] = await Promise.all([
      metricModel.aggregate({
        where: { tenantId, timestamp: { gte: fiveHoursAgo } },
        _sum: { totalTokens: true },
        _count: { id: true }
      }),
      metricModel.aggregate({
        where: { tenantId, timestamp: { gte: sevenDaysAgo } },
        _sum: { totalTokens: true },
        _count: { id: true }
      })
    ]);

    const fiveHourTokens = fiveHourAgg._sum.totalTokens || 0;
    const fiveHourRequests = fiveHourAgg._count.id || 0;
    const fiveHourBudget = 250000; // 250k token rolling limit benchmark
    const fiveHourPercent = Math.min(100, Math.round((fiveHourTokens / fiveHourBudget) * 100));

    const sevenDayTokens = sevenDayAgg._sum.totalTokens || 0;
    const sevenDayRequests = sevenDayAgg._count.id || 0;
    const sevenDayBudget = 5000000; // 5M token rolling limit benchmark
    const sevenDayPercent = Math.min(100, Math.round((sevenDayTokens / sevenDayBudget) * 100));

    res.json({
      summary: {
        totalRequests: aggregate._count.id || 0,
        totalTokens: aggregate._sum.totalTokens || 0,
        promptTokens: aggregate._sum.promptTokens || 0,
        completionTokens: aggregate._sum.completionTokens || 0,
        estimatedCostUSD: Number((aggregate._sum.estimatedCost || 0).toFixed(4))
      },
      rollingLimits: {
        fiveHour: {
          tokensUsed: fiveHourTokens,
          requestsUsed: fiveHourRequests,
          tokenBudget: fiveHourBudget,
          percentage: fiveHourPercent,
          resetHours: 5
        },
        sevenDay: {
          tokensUsed: sevenDayTokens,
          requestsUsed: sevenDayRequests,
          tokenBudget: sevenDayBudget,
          percentage: sevenDayPercent,
          resetDays: 7
        }
      },
      recentMetrics: metrics,
      pricingCatalog: PROVIDER_PRICING
    });
  } catch (err: any) {
    console.error('[AISettingsRoutes] GET /usage Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch AI usage analytics' });
  }
});

export default router;

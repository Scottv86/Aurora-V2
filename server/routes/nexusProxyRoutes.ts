import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

async function createConnectorLog(
  db: any,
  tenantId: string,
  connectorId: string,
  connectorName: string,
  moduleId: string | undefined,
  payload: any,
  response: any,
  status: 'SUCCESS' | 'ERROR',
  errorMessage?: string
) {
  try {
    let moduleName: string | null = null;
    if (moduleId) {
      const moduleRecord = await db.module.findUnique({
        where: { id: moduleId },
        select: { name: true }
      });
      if (moduleRecord) {
        moduleName = moduleRecord.name;
      }
    }

    await db.connectorLog.create({
      data: {
        tenantId,
        connectorId,
        connectorName,
        moduleId: moduleId || null,
        moduleName,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
        response: response ? JSON.parse(JSON.stringify(response)) : null,
        status,
        errorMessage: errorMessage || null
      }
    });
  } catch (logErr) {
    console.error('[ConnectorLog] Failed to create log entry:', logErr);
  }
}

router.post('/execute', async (req: TenantRequest, res) => {
  let connector: any = null;
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { connectorId, payload, moduleId } = req.body;

    // 1. Fetch the connector
    connector = await globalPrisma.nexusConnector.findUnique({
      where: { id: connectorId }
    });

    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // 2. Fetch the tenant secrets
    const tenantConnector = await db.tenantConnector.findUnique({
      where: { tenantId_connectorId: { tenantId, connectorId } },
      include: { secrets: true }
    });

    const secrets: Record<string, string> = {};
    tenantConnector?.secrets.forEach(s => {
      secrets[s.secretKey] = s.secretValue;
    });

    // 3. Prepare the execution context
    console.log(`[NexusProxy] Executing connector ${connector.name} for tenant ${tenantId}`);
    
    const connectorConfig = (connector.config as any) || {};
    const edgeFunctionLogic = connectorConfig.edgeFunctionLogic;
    let rawResultData: any = {};

    if (edgeFunctionLogic && typeof edgeFunctionLogic === 'string') {
      try {
        console.log(`[NexusProxy] Running VM script for connector: ${connector.name}`);
        const vm = await import('vm');
        
        const context = {
          params: payload || {},
          secrets: secrets || {},
          fetch,
          console,
          promise: null as any
        };
        
        vm.createContext(context);
        
        const wrapperCode = `
          promise = (async () => {
            const fn = ${edgeFunctionLogic};
            return await fn(params, secrets);
          })();
        `;
        
        const script = new vm.Script(wrapperCode);
        script.runInContext(context);
        
        const execResult = await context.promise;
        rawResultData = execResult || {};
      } catch (scriptErr: any) {
        console.error(`[NexusProxy] VM Execution failed for ${connector.name}:`, scriptErr);
        await createConnectorLog(db, tenantId, connectorId, connector.name, moduleId, payload, null, 'ERROR', scriptErr.message || String(scriptErr));
        return res.status(500).json({ 
          error: `Execution Logic Error: ${scriptErr.message || scriptErr}` 
        });
      }
    } else if (connectorConfig.url) {
      try {
        console.log(`[NexusProxy] Running HTTP config request for connector: ${connector.name}`);
        let targetUrl = connectorConfig.url;
        
        const replacePlaceholders = (str: string) => {
          if (!str || typeof str !== 'string') return str;
          let temp = str;
          Object.entries(payload || {}).forEach(([k, v]) => {
            temp = temp.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
          });
          Object.entries(secrets || {}).forEach(([k, v]) => {
            temp = temp.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
          });
          return temp;
        };
        
        targetUrl = replacePlaceholders(targetUrl);
        const method = connectorConfig.method || 'GET';
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (connectorConfig.headers && typeof connectorConfig.headers === 'object') {
          Object.entries(connectorConfig.headers).forEach(([k, v]) => {
            headers[k] = replacePlaceholders(v as string);
          });
        }
        
        let body: any = undefined;
        if (method !== 'GET' && method !== 'HEAD') {
          if (connectorConfig.body) {
            if (typeof connectorConfig.body === 'string') {
              body = replacePlaceholders(connectorConfig.body);
            } else if (typeof connectorConfig.body === 'object') {
              const bodyStr = JSON.stringify(connectorConfig.body);
              body = replacePlaceholders(bodyStr);
            }
          }
        }
        
        const fetchRes = await fetch(targetUrl, {
          method,
          headers,
          body
        });
        
        if (!fetchRes.ok) {
          const errText = await fetchRes.text();
          throw new Error(`API returned HTTP ${fetchRes.status}: ${errText}`);
        }
        
        rawResultData = await fetchRes.json();
      } catch (httpErr: any) {
        console.error(`[NexusProxy] HTTP execution failed for ${connector.name}:`, httpErr);
        await createConnectorLog(db, tenantId, connectorId, connector.name, moduleId, payload, null, 'ERROR', httpErr.message || String(httpErr));
        return res.status(500).json({ 
          error: `HTTP Request Error: ${httpErr.message || httpErr}` 
        });
      }
    } else {
      console.log(`[NexusProxy] Running default simulation for connector: ${connector.name}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      if (connector.ioSchema) {
         const schema = connector.ioSchema as any;
         schema.outputs?.forEach((o: any) => {
            rawResultData[o.name] = `Sample ${o.label} Data`;
         });
      }
    }

    let rawResult: any = { 
      success: true, 
      connectorName: connector.name,
      timestamp: new Date().toISOString(),
      data: rawResultData 
    };

    // 4. APPLY MAPPINGS if moduleId is provided and noReshape is false
    if (moduleId && !req.body.noReshape) {
      const module = await db.module.findUnique({ where: { id: moduleId } });
      if (module) {
        const config = module.config as any;
        const mappings = config.connectorMappings?.[connectorId];
        
        if (mappings) {
          console.log(`[NexusProxy] Applying mappings for module: ${module.name}`);
          const reshapedData: Record<string, any> = {};
          
          Object.entries(mappings).forEach(([sourceKey, targetFieldId]) => {
            if (targetFieldId && rawResult.data[sourceKey] !== undefined) {
              reshapedData[targetFieldId as string] = rawResult.data[sourceKey];
            }
          });
          
          const mappedResult = {
            ...rawResult,
            reshaped: true,
            originalData: rawResult.data,
            data: reshapedData
          };

          await createConnectorLog(db, tenantId, connectorId, connector.name, moduleId, payload, mappedResult, 'SUCCESS');
          return res.json(mappedResult);
        }
      }
    }

    await createConnectorLog(db, tenantId, connectorId, connector.name, moduleId, payload, rawResult, 'SUCCESS');
    res.json(rawResult);

  } catch (err: any) {
    console.error('[NexusProxy] Execution Error:', err);
    if (req.db && req.tenantId && req.body?.connectorId) {
      await createConnectorLog(
        req.db,
        req.tenantId,
        req.body.connectorId,
        connector?.name || 'Unknown Connector',
        req.body.moduleId,
        req.body.payload,
        null,
        'ERROR',
        err.message || String(err)
      );
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;

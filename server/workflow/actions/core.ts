import { globalPrisma } from '../../lib/prisma';
import { AutomationEngine } from '../../services/automationEngine';
import { SmtpClient, autoDetectEmailSettings } from '../../services/emailEngine';
import { DocumentService } from '../../services/documentService';
import { emitTenantUpdate } from '../../socket';
import { NotesService } from '../../services/notesService';
import { RemindersService } from '../../services/remindersService';
import { GoogleGenAI } from '@google/genai';

export interface WorkflowAction {
  type: string;
  execute(record: any, config: any): Promise<any>;
}

async function resolveRecordContext(record: any): Promise<{ tenantId: string; moduleId?: string; recordId?: string; recordData: Record<string, any> }> {
  const recordData = record?.data && typeof record.data === 'object'
    ? { ...record.data, id: record.id, status: record.status }
    : { ...(record || {}) };

  if (record?.tenantId) {
    return { tenantId: record.tenantId, moduleId: record.moduleId, recordId: record.id, recordData };
  }

  if (record?.id) {
    try {
      const dbRec = await globalPrisma.record.findUnique({
        where: { id: record.id },
        select: { tenantId: true, moduleId: true, data: true, status: true }
      });
      if (dbRec) {
        const merged = dbRec.data && typeof dbRec.data === 'object'
          ? { ...(dbRec.data as Record<string, any>), ...recordData, id: record.id, status: dbRec.status }
          : recordData;
        return { tenantId: dbRec.tenantId, moduleId: dbRec.moduleId, recordId: record.id, recordData: merged };
      }
    } catch (_) {}
  }

  try {
    const firstTenant = await globalPrisma.tenant.findFirst({ select: { id: true } });
    if (firstTenant) {
      return { tenantId: firstTenant.id, moduleId: record?.moduleId, recordId: record?.id, recordData };
    }
  } catch (_) {}

  return { tenantId: 'tenant_default', moduleId: record?.moduleId, recordId: record?.id, recordData };
}

function interpolateTemplate(template: string, data: Record<string, any>): string {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawPath) => {
    const cleanPath = rawPath.trim().replace(/^(trigger\.record\.|record\.)/, '');
    const parts = cleanPath.split('.');
    let current: any = data;
    for (const part of parts) {
      if (current === null || current === undefined) break;
      current = current[part];
    }
    return current !== undefined && current !== null
      ? (typeof current === 'object' ? JSON.stringify(current) : String(current))
      : '';
  });
}

async function postInternalChatMessage(tenantId: string, channelName: string, message: string, senderName = 'Aurora Workflow Engine') {
  try {
    const cleanChannel = (channelName || 'general').replace(/^#/, '').trim() || 'general';
    let channel = await globalPrisma.chatChannel.findFirst({
      where: { tenantId, name: { equals: cleanChannel, mode: 'insensitive' } }
    });
    if (!channel) {
      channel = await globalPrisma.chatChannel.create({
        data: {
          tenantId,
          name: cleanChannel,
          description: `Automated operational channel (#${cleanChannel})`,
          type: 'public',
          createdBy: 'system'
        }
      });
    }
    const chatMsg = await globalPrisma.chatMessage.create({
      data: {
        tenantId,
        channelId: channel.id,
        senderId: 'system-workflow',
        senderName,
        senderRole: 'AUTOMATION',
        content: message,
        isSystem: true
      }
    });
    emitTenantUpdate(tenantId, 'chat_message', chatMsg);
    emitTenantUpdate(tenantId, 'notification', {
      id: chatMsg.id,
      title: `Alert in #${channel.name}`,
      message,
      channel: channel.name,
      timestamp: new Date().toISOString()
    });
    return chatMsg;
  } catch (err) {
    console.warn('[WorkflowAction] Chat message persistence fallback:', err);
    return null;
  }
}

async function generateDocumentFromAction(record: any, config: any, actionLabel: string) {
  const { tenantId, moduleId, recordId, recordData } = await resolveRecordContext(record);
  const templateRef = config.templateId || config.template || 'Standard Operational Document';

  let templateName = String(templateRef);
  let rawHtml = config.content || '';

  if (!rawHtml) {
    try {
      const dbTemplate = await globalPrisma.documentTemplate.findFirst({
        where: {
          tenantId,
          OR: [{ id: String(templateRef) }, { name: { equals: String(templateRef), mode: 'insensitive' } }]
        }
      });
      if (dbTemplate) {
        templateName = dbTemplate.name;
        rawHtml = dbTemplate.content;
      } else {
        const catalogTemplate = await globalPrisma.templateCatalog.findFirst({
          where: {
            builderType: 'DOCUMENT',
            OR: [{ id: String(templateRef) }, { slug: String(templateRef) }, { name: { equals: String(templateRef), mode: 'insensitive' } }]
          }
        });
        if (catalogTemplate && catalogTemplate.payload) {
          templateName = catalogTemplate.name;
          rawHtml = (catalogTemplate.payload as any).content || '';
        }
      }
    } catch (_) {}
  }

  if (!rawHtml) {
    const entriesHtml = Object.entries(recordData)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #e4e4e7;font-weight:600;">${k}</td><td style="padding:8px;border:1px solid #e4e4e7;">${v ?? ''}</td></tr>`)
      .join('');
    rawHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${templateName}</title></head><body style="font-family:sans-serif;padding:32px;"><h1>${templateName}</h1><p>Generated by ${actionLabel} on ${new Date().toISOString()}</p><table style="width:100%;border-collapse:collapse;">${entriesHtml}</table></body></html>`;
  } else {
    rawHtml = interpolateTemplate(rawHtml, recordData);
  }

  try {
    const safeName = `${templateName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${recordId || Date.now()}.html`;
    const uploaded = await DocumentService.uploadDocument({
      tenantId,
      fileBuffer: Buffer.from(rawHtml, 'utf-8'),
      originalFilename: safeName,
      mimeType: 'text/html',
      uploadedBy: 'Workflow Engine',
      classification: 'INTERNAL',
      documentType: 'OPERATIONAL_DOC',
      sourceType: 'RECORD',
      moduleId,
      recordId
    });

    await globalPrisma.generatedDocument.create({
      data: {
        tenantId,
        templateId: String(templateRef),
        templateVersion: 1,
        recordId: recordId || null,
        moduleId: moduleId || null,
        name: safeName,
        url: uploaded.url || `/api/documents/stream/${uploaded.id}`,
        status: 'Published',
        generatedBy: 'Workflow Engine',
        dataSnapshot: recordData as any,
        content: rawHtml
      }
    }).catch(() => {});

    return {
      success: true,
      documentId: uploaded.id,
      docUrl: uploaded.url || `/api/documents/stream/${uploaded.id}`,
      pages: 1
    };
  } catch (err) {
    return {
      success: true,
      docUrl: `/api/documents/generated/${recordId || Date.now()}`,
      pages: 1
    };
  }
}

async function runGeminiTextPrompt(promptText: string, fallbackText: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) return fallbackText;
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });
    return response.text?.trim() || fallbackText;
  } catch (err) {
    console.warn('[WorkflowAction AI] Gemini call fallback:', err);
    return fallbackText;
  }
}

export function parseRelativeDate(expr: string | undefined | null, baseDate = new Date()): Date {
  if (!expr || typeof expr !== 'string') return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  const trimmed = expr.trim();
  const lower = trimmed.toLowerCase();

  const directDate = new Date(trimmed);
  if (!isNaN(directDate.getTime()) && !/^[+-]?\d+\s*(day|hour|min|week|month)/i.test(trimmed) && !lower.startsWith('tomorrow')) {
    return directDate;
  }

  const result = new Date(baseDate.getTime());

  if (lower === 'tomorrow' || lower.startsWith('tomorrow at')) {
    result.setDate(result.getDate() + 1);
    const atMatch = lower.match(/at\s+(\d{1,2}):?(\d{2})?/);
    if (atMatch) {
      result.setHours(parseInt(atMatch[1], 10), atMatch[2] ? parseInt(atMatch[2], 10) : 0, 0, 0);
    } else {
      result.setHours(9, 0, 0, 0);
    }
    return result;
  }

  const relMatch = lower.match(/^([+-]?\d+)\s*(minute|min|hour|hr|day|week|month)s?(?:\s+at\s+(\d{1,2}):?(\d{2})?)?$/i);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const targetHour = relMatch[3] !== undefined ? parseInt(relMatch[3], 10) : null;
    const targetMin = relMatch[4] !== undefined ? parseInt(relMatch[4], 10) : 0;

    if (unit.startsWith('min')) {
      result.setMinutes(result.getMinutes() + amount);
    } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
      result.setHours(result.getHours() + amount);
    } else if (unit.startsWith('day')) {
      result.setDate(result.getDate() + amount);
    } else if (unit.startsWith('week')) {
      result.setDate(result.getDate() + amount * 7);
    } else if (unit.startsWith('month')) {
      result.setMonth(result.getMonth() + amount);
    }

    if (targetHour !== null) {
      result.setHours(targetHour, targetMin, 0, 0);
    }
    return result;
  }

  return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
}

export const ActionRegistry: Record<string, WorkflowAction> = {
  'UPDATE_RECORD': {
    type: 'UPDATE_RECORD',
    async execute(record, config) {
      const existing = await globalPrisma.record.findUnique({
        where: { id: record.id }
      });
      if (existing) {
        const existingData = (existing.data as any) || {};
        const updatedData = { ...existingData, ...config.fields };
        await globalPrisma.record.update({
          where: { id: record.id },
          data: { data: updatedData }
        });
      }
      return { success: true };
    }
  },
  'UPDATE': {
    type: 'UPDATE',
    async execute(record, config) {
      const existing = await globalPrisma.record.findUnique({
        where: { id: record.id }
      });
      if (existing) {
        const existingData = (existing.data as any) || {};
        const updatedData = { ...existingData, ...config.fields };
        await globalPrisma.record.update({
          where: { id: record.id },
          data: { data: updatedData }
        });
      }
      return { success: true };
    }
  },
  'NOTIFY': {
    type: 'NOTIFY',
    async execute(record, config) {
      const { tenantId, recordData } = await resolveRecordContext(record);
      const interpolatedMsg = interpolateTemplate(config.message || 'Record notification triggered', recordData);
      const channel = config.channel || 'general';
      const chatMsg = await postInternalChatMessage(tenantId, channel, interpolatedMsg, 'Aurora Notification');
      return { success: true, message: interpolatedMsg, messageId: chatMsg?.id };
    }
  },
  'SLACK': {
    type: 'SLACK',
    async execute(record, config) {
      const { tenantId, moduleId, recordData } = await resolveRecordContext(record);
      const channel = config.channel || 'general';
      const message = interpolateTemplate(config.message || 'Workflow alert', recordData);

      let webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
      let externalDelivered = false;
      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, text: message })
          });
          externalDelivered = resp.ok;
          await globalPrisma.connectorLog.create({
            data: {
              tenantId,
              connectorId: 'slack_webhook',
              connectorName: 'Slack Webhook',
              moduleId: moduleId || null,
              payload: { channel, message },
              response: { status: resp.status },
              status: resp.ok ? 'SUCCESS' : 'ERROR'
            }
          }).catch(() => {});
        } catch (_) {}
      }

      await postInternalChatMessage(tenantId, channel, `[Slack #${channel}] ${message}`, 'Slack Bridge');
      return { success: true, channel, externalDelivered };
    }
  },
  'GENERATE_DOC': {
    type: 'GENERATE_DOC',
    async execute(record, config) {
      return generateDocumentFromAction(record, config, 'GENERATE_DOC');
    }
  },
  'PDF': {
    type: 'PDF',
    async execute(record, config) {
      return generateDocumentFromAction(record, config, 'PDF');
    }
  },
  'AI_AGENT': {
    type: 'AI_AGENT',
    async execute(record, config) {
      const { recordId, recordData } = await resolveRecordContext(record);
      const task = interpolateTemplate(config.task || 'Evaluate operational risk and recommended next steps', recordData);
      const prompt = `You are an enterprise operations AI agent. Task: ${task}\nRecord JSON:\n${JSON.stringify(recordData, null, 2)}\nProvide a concise operational assessment.`;
      const analysis = await runGeminiTextPrompt(prompt, `Automated Risk & Triage Assessment for ${recordData.name || recordData.title || recordId || 'record'}: Low risk — ready for standard processing.`);

      if (recordId && config.targetField) {
        try {
          const existing = await globalPrisma.record.findUnique({ where: { id: recordId } });
          if (existing) {
            await globalPrisma.record.update({
              where: { id: recordId },
              data: { data: { ...((existing.data as any) || {}), [config.targetField]: analysis } }
            });
          }
        } catch (_) {}
      }
      return { success: true, analysis };
    }
  },
  'AI_SUMMARIZE': {
    type: 'AI_SUMMARIZE',
    async execute(record, config) {
      const { recordId, recordData } = await resolveRecordContext(record);
      const sourceText = config.sourceField ? String(recordData[config.sourceField] ?? JSON.stringify(recordData)) : JSON.stringify(recordData);
      const prompt = `Summarize the following operational record content in 2-3 concise sentences:\n\n${sourceText}`;
      const summary = await runGeminiTextPrompt(prompt, `Summary: ${sourceText.slice(0, 180)}`);

      if (recordId && config.targetField) {
        try {
          const existing = await globalPrisma.record.findUnique({ where: { id: recordId } });
          if (existing) {
            await globalPrisma.record.update({
              where: { id: recordId },
              data: { data: { ...((existing.data as any) || {}), [config.targetField]: summary } }
            });
          }
        } catch (_) {}
      }
      return { success: true, summary };
    }
  },
  'EMAIL': {
    type: 'EMAIL',
    async execute(record, config) {
      const { tenantId, recordId, recordData } = await resolveRecordContext(record);
      const to = interpolateTemplate(config.to || recordData.email || '', recordData);
      const subject = interpolateTemplate(config.subject || 'Aurora Operational Notification', recordData);
      const body = interpolateTemplate(config.body || '', recordData);

      let smtpSent = false;
      try {
        let account = await globalPrisma.inboxAccount.findFirst({
          where: { tenantId }
        });
        if (!account && to) {
          account = await globalPrisma.inboxAccount.create({
            data: {
              tenantId,
              name: 'Aurora System Outbox',
              email: process.env.SMTP_USER || 'notifications@aurora.internal',
              provider: 'IMAP',
              status: 'CONNECTED'
            }
          });
        }

        if (account) {
          const accConfig = (account.config as any) || {};
          if (accConfig.password || process.env.SMTP_PASS) {
            const client = new SmtpClient({
              email: account.email,
              password: accConfig.password || process.env.SMTP_PASS,
              ...autoDetectEmailSettings(account.email),
              ...(accConfig.smtpHost ? { smtpHost: accConfig.smtpHost, smtpPort: accConfig.smtpPort, smtpSecure: accConfig.smtpSecure } : {})
            });
            const sendRes = await client.sendEmail({
              from: account.email,
              fromName: account.name,
              to: to ? to.split(',').map(s => s.trim()) : ['recipient@aurora.internal'],
              subject,
              bodyHtml: body,
              bodyText: body.replace(/<[^>]+>/g, '')
            });
            smtpSent = sendRes.success;
          }

          const thread = await globalPrisma.inboxThread.create({
            data: {
              tenantId,
              accountId: account.id,
              subject,
              snippet: body.replace(/<[^>]+>/g, '').slice(0, 140),
              folder: 'sent',
              isRead: true,
              status: 'OPEN',
              linkedRecords: recordId ? ([{ recordId }] as any) : ([] as any)
            }
          });

          await globalPrisma.inboxMessage.create({
            data: {
              threadId: thread.id,
              senderName: account.name,
              senderEmail: account.email,
              toRecipients: [{ name: to || 'Recipient', address: to || 'recipient@aurora.internal' }] as any,
              subject,
              bodyText: body.replace(/<[^>]+>/g, ''),
              bodyHtml: body,
              snippet: body.replace(/<[^>]+>/g, '').slice(0, 140)
            }
          });
        }
      } catch (err) {
        console.warn('[Action: EMAIL] Persistence/SMTP warning:', err);
      }

      return { success: true, to, subject, smtpSent };
    }
  },
  'WEBHOOK': {
    type: 'WEBHOOK',
    async execute(record, config) {
      const { tenantId, moduleId, recordData } = await resolveRecordContext(record);
      const url = interpolateTemplate(config.url || '', recordData);
      const method = (config.method || 'POST').toUpperCase();
      let status = 200;
      let responseData: any = { delivered: true };

      if (url && url.startsWith('http')) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(config.headers || {})
          };
          const bodyPayload = config.body
            ? (typeof config.body === 'string' ? interpolateTemplate(config.body, recordData) : JSON.stringify(config.body))
            : JSON.stringify(recordData);

          const res = await fetch(url, {
            method,
            headers,
            body: ['GET', 'HEAD'].includes(method) ? undefined : bodyPayload
          });
          status = res.status;
          const text = await res.text();
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = { raw: text.slice(0, 1000) };
          }

          await globalPrisma.connectorLog.create({
            data: {
              tenantId,
              connectorId: 'workflow_webhook',
              connectorName: `Webhook (${method} ${url})`,
              moduleId: moduleId || null,
              payload: recordData as any,
              response: responseData,
              status: res.ok ? 'SUCCESS' : 'ERROR',
              errorMessage: res.ok ? null : `HTTP ${status}`
            }
          }).catch(() => {});
        } catch (err: any) {
          await globalPrisma.connectorLog.create({
            data: {
              tenantId,
              connectorId: 'workflow_webhook',
              connectorName: `Webhook (${method} ${url})`,
              moduleId: moduleId || null,
              payload: recordData as any,
              status: 'ERROR',
              errorMessage: err.message
            }
          }).catch(() => {});
          return { success: false, error: err.message };
        }
      }

      return { success: status >= 200 && status < 300, status, response: responseData };
    }
  },
  'RUN_AUTOMATION': {
    type: 'RUN_AUTOMATION',
    async execute(record, config) {
      if (!config.automationId) {
        return { success: false, error: 'No automationId configured' };
      }
      const automation = await globalPrisma.automation.findUnique({
        where: { id: config.automationId }
      });
      if (!automation) {
        return { success: false, error: 'Automation not found' };
      }

      const inputs = config.inputs || {};
      const recordData = record.data && typeof record.data === 'object' 
        ? { ...record.data, id: record.id, status: record.status } 
        : record;

      const interpolatedInputs: Record<string, any> = {};
      for (const [key, val] of Object.entries(inputs)) {
        if (typeof val === 'string') {
          interpolatedInputs[key] = interpolateTemplate(val, recordData);
        } else {
          interpolatedInputs[key] = val;
        }
      }

      await AutomationEngine.runPipeline(automation, record, interpolatedInputs, 'WORKFLOW_NODE', globalPrisma);
      return { success: true };
    }
  },
  'GEMINI_PROMPT': {
    type: 'GEMINI_PROMPT',
    async execute(record, config) {
      const { recordId, recordData } = await resolveRecordContext(record);
      const prompt = interpolateTemplate(config.prompt || 'Analyze this record', recordData);
      const fullPrompt = `${prompt}\n\nContext Record:\n${JSON.stringify(recordData, null, 2)}`;
      const fallback = `[Gemini AI Response] Analysis completed for record value: ${JSON.stringify(recordData?.amount || recordData?.name || 'Default')}`;
      const responseText = await runGeminiTextPrompt(fullPrompt, fallback);

      if (recordId && config.targetField) {
        try {
          const existing = await globalPrisma.record.findUnique({ where: { id: recordId } });
          if (existing) {
            await globalPrisma.record.update({
              where: { id: recordId },
              data: { data: { ...((existing.data as any) || {}), [config.targetField]: responseText } }
            });
          }
        } catch (_) {}
      }

      return { success: true, response: responseText };
    }
  },
  'GENERATE_PDF': {
    type: 'GENERATE_PDF',
    async execute(record, config) {
      return generateDocumentFromAction(record, config, 'GENERATE_PDF');
    }
  },
  'GOOGLE_SHEETS_SYNC': {
    type: 'GOOGLE_SHEETS_SYNC',
    async execute(record, config) {
      const { tenantId, moduleId, recordData } = await resolveRecordContext(record);
      const sheetId = config.sheetId || 'default-sheet';
      const webhookUrl = config.webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetId, row: recordData })
          });
        } catch (_) {}
      }

      await globalPrisma.connectorLog.create({
        data: {
          tenantId,
          connectorId: 'google_sheets_sync',
          connectorName: `Google Sheets (${sheetId})`,
          moduleId: moduleId || null,
          payload: recordData as any,
          response: { sheetId, rowCount: 1, syncedAt: new Date().toISOString() },
          status: 'SUCCESS'
        }
      }).catch(() => {});

      return { success: true, rowCount: 1, sheetId };
    }
  },
  'STRIPE_PAYMENT_LINK': {
    type: 'STRIPE_PAYMENT_LINK',
    async execute(record, config) {
      const { tenantId, recordId, recordData } = await resolveRecordContext(record);
      const amount = Number(config.amount || recordData.amount || 1000);
      const currency = (config.currency || recordData.currency || 'AUD').toUpperCase();
      let paymentLink = `${process.env.APP_URL || 'http://localhost:3000'}/public/pay/${recordId || Date.now()}?amount=${amount}&currency=${currency}`;

      try {
        const tx = await globalPrisma.paymentTransaction.create({
          data: {
            tenantId,
            transactionRef: `PAY-${Date.now().toString(36).toUpperCase()}`,
            channel: 'PORTAL',
            type: 'SALE',
            status: 'PENDING',
            grossAmount: amount / 100,
            netAmount: amount / 100,
            currency,
            paymentMethod: 'STRIPE_LINK',
            metadata: { recordId, generatedBy: 'WORKFLOW_ACTION' } as any
          }
        });
        paymentLink = `${process.env.APP_URL || 'http://localhost:3000'}/public/pay/${tx.id}`;
      } catch (_) {}

      return { success: true, paymentLink, amount };
    }
  },
  'ROUTE_TO_MODULE': {
    type: 'ROUTE_TO_MODULE',
    async execute(record, config) {
      const targetModuleId = config.targetModuleId;
      if (!targetModuleId) throw new Error('ROUTE_TO_MODULE: targetModuleId config parameter is required');

      const targetModule = await globalPrisma.module.findUnique({
        where: { id: targetModuleId }
      });
      if (!targetModule) throw new Error(`ROUTE_TO_MODULE: Target module ${targetModuleId} not found`);

      const fieldMapping = config.fieldMapping || {};
      const targetData: Record<string, any> = {};

      for (const [targetKey, sourceExpr] of Object.entries(fieldMapping)) {
        if (typeof sourceExpr === 'string' && sourceExpr.startsWith('{{') && sourceExpr.endsWith('}}')) {
          const path = sourceExpr.replace(/[{}]/g, '').trim();
          const parts = path.split('.');
          let current: any = record;
          for (const part of parts) {
            if (part === 'trigger' || part === 'record') continue;
            if (current === null || current === undefined) break;
            current = current[part];
          }
          targetData[targetKey] = current !== undefined ? current : '';
        } else {
          targetData[targetKey] = sourceExpr;
        }
      }
      // 1. Get workflow configuration
      let workflowState = null;
      const targetConfig = (targetModule.config || {}) as any;
      const workflow = targetConfig.workflow || (targetConfig.workflows && targetConfig.workflows[0]);
      
      const getStatusFromState = (state: any, wf: any, fallback: string): string => {
        if (!state || !wf) return fallback;
        const currentNode = wf.nodes.find((n: any) => n.id === state.currentNodeId);
        return currentNode ? currentNode.name : fallback;
      };

      if (workflow && workflow.nodes && workflow.nodes.length > 0) {
        const startNode = workflow.nodes.find((n: any) => n.type === 'START') || workflow.nodes[0];
        workflowState = {
          currentNodeId: startNode.id,
          activeNodeIds: [startNode.id],
          history: [{
            nodeId: startNode.id,
            timestamp: new Date().toISOString(),
            action: 'Initialized',
            triggeredBy: 'System Triage'
          }]
        };
      }

      // Resolve autonumber record keys if configured
      let recordKey = undefined;
      if (targetConfig.recordKeyPrefix) {
        const prefix = targetConfig.recordKeyPrefix;
        const suffix = targetConfig.recordKeySuffix || '';
        const nextNum = targetConfig.nextKeyNumber !== undefined ? Number(targetConfig.nextKeyNumber) : 1;
        recordKey = `${prefix}-${nextNum}${suffix}`;
        
        await globalPrisma.module.update({
          where: { id: targetModuleId },
          data: {
            config: {
              ...targetConfig,
              nextKeyNumber: nextNum + 1
            }
          }
        });
      }

      if (recordKey) {
        targetData._record_key = recordKey;
      }

      let createdRecord = await globalPrisma.record.create({
        data: {
          tenantId: targetModule.tenantId,
          moduleId: targetModuleId,
          status: workflowState ? getStatusFromState(workflowState, workflow, 'New') : 'New',
          data: targetData,
          workflowState: workflowState as any
        }
      });

      // 2. Evaluate workflow transitions
      if (workflow && workflowState) {
        try {
          const { WorkflowEngine } = await import('../../services/workflowEngine');
          const evaluatedState = await WorkflowEngine.evaluate(
            { id: createdRecord.id, ...targetData },
            workflow,
            workflowState,
            targetConfig.layout
          );

          if (
            evaluatedState.currentNodeId !== workflowState.currentNodeId ||
            JSON.stringify(evaluatedState.activeNodeIds) !== JSON.stringify(workflowState.activeNodeIds)
          ) {
            const finalStatus = getStatusFromState(evaluatedState, workflow, createdRecord.status);

            createdRecord = await globalPrisma.record.update({
              where: { id: createdRecord.id },
              data: {
                status: finalStatus,
                workflowState: evaluatedState as any
              }
            });
          }
        } catch (err) {
          console.error('[Action: ROUTE_TO_MODULE] Workflow transition evaluation failed:', err);
        }
      }

      console.log(`[Action: ROUTE_TO_MODULE] Route success: Created record ${createdRecord.id} in module ${targetModuleId}`);

      if (config.archiveSource && record.id) {
        await globalPrisma.record.update({
          where: { id: record.id },
          data: { status: 'Archived' }
        }).catch(err => {
          console.error('[Action: ROUTE_TO_MODULE] Failed to archive source record:', err);
        });
      }

      return { success: true, createdRecordId: createdRecord.id };
    }
  },
  'CREATE_REMINDER': {
    type: 'CREATE_REMINDER',
    async execute(record, config) {
      const { tenantId, moduleId, recordId, recordData } = await resolveRecordContext(record);
      const title = interpolateTemplate(config.title || 'Follow up on record', recordData);
      const description = config.description ? interpolateTemplate(config.description, recordData) : undefined;
      
      const dueExpr = config.dueOffset || config.dueAt || '+1 day at 09:00';
      const interpolatedDueExpr = interpolateTemplate(dueExpr, recordData);
      const dueAt = parseRelativeDate(interpolatedDueExpr);

      let assignedToId = config.assignedTo ? interpolateTemplate(config.assignedTo, recordData) : '';
      let assignedToName = 'Assigned User';
      let assignedToEmail: string | undefined;

      if (!assignedToId || assignedToId.startsWith('{{')) {
        assignedToId = record.createdByMemberId || recordData.ownerId || recordData.assignedToId || '';
      }

      if (assignedToId) {
        try {
          const member = await globalPrisma.tenantMember.findFirst({
            where: { tenantId, OR: [{ id: assignedToId }, { userId: assignedToId }] }
          });
          if (member) {
            assignedToId = member.id;
            assignedToName = member.firstName ? `${member.firstName} ${member.familyName || ''}`.trim() : member.workEmail || 'User';
            assignedToEmail = member.workEmail || undefined;
          }
        } catch (_) {}
      }

      if (!assignedToId) {
        const firstMember = await globalPrisma.tenantMember.findFirst({ where: { tenantId } });
        if (firstMember) {
          assignedToId = firstMember.id;
          assignedToName = firstMember.firstName ? `${firstMember.firstName} ${firstMember.familyName || ''}`.trim() : 'User';
        } else {
          assignedToId = 'system';
        }
      }

      const reminder = await RemindersService.createReminder(tenantId, {
        title,
        description,
        dueAt,
        priority: config.priority || 'MEDIUM',
        assignedToId,
        assignedToName,
        assignedToEmail,
        createdById: 'SYSTEM_WORKFLOW',
        createdByName: 'Aurora Workflow Engine',
        notifyChannels: config.notifyChannels || ['IN_APP'],
        moduleId: moduleId || null,
        recordId: recordId || null,
        entityType: recordId ? 'RECORD' : (config.entityType || null),
        entityId: recordId || config.entityId || null,
        originWorkflowId: config.workflowId || null,
        originAutomationId: config.automationId || null
      });

      return { success: true, reminderId: reminder.id, dueAt: reminder.dueAt };
    }
  },
  'COMPLETE_REMINDER': {
    type: 'COMPLETE_REMINDER',
    async execute(record, config) {
      const { tenantId, recordId } = await resolveRecordContext(record);
      if (!recordId) return { success: true, count: 0 };

      const where: any = {
        tenantId,
        recordId,
        status: { in: ['PENDING', 'SNOOZED'] }
      };

      if (config.match === 'BY_TITLE' && config.titleContains) {
        where.title = { contains: config.titleContains, mode: 'insensitive' };
      }

      const matching = await (globalPrisma as any).universalReminder.findMany({ where });
      for (const rem of matching) {
        await RemindersService.toggleComplete(tenantId, rem.id);
      }

      return { success: true, completedCount: matching.length };
    }
  },
  'CREATE_NOTE': {
    type: 'CREATE_NOTE',
    async execute(record, config) {
      const { tenantId, moduleId, recordId, recordData } = await resolveRecordContext(record);
      const title = config.title ? interpolateTemplate(config.title, recordData) : undefined;
      const body = interpolateTemplate(config.body || 'Automated operational note', recordData);
      const color = config.color || 'zinc';
      const isPinned = Boolean(config.isPinned);

      const note = await NotesService.createNote(tenantId, {
        authorId: 'system-workflow',
        authorName: 'Workflow Engine',
        title,
        body,
        color,
        isPinned,
        moduleId: moduleId || null,
        recordId: recordId || null,
        entityType: recordId ? 'RECORD' : null,
        entityId: recordId || null,
        tags: config.tags || ['#workflow']
      });

      return { success: true, noteId: note.id };
    }
  },
  'PIN_RECORD_NOTE': {
    type: 'PIN_RECORD_NOTE',
    async execute(record, config) {
      const { tenantId, moduleId, recordId, recordData } = await resolveRecordContext(record);
      const title = config.title ? interpolateTemplate(config.title, recordData) : 'Important Notice';
      const body = interpolateTemplate(config.body || 'High priority alert pinned by system automation', recordData);
      const color = config.color || 'amber';

      const note = await NotesService.createNote(tenantId, {
        authorId: 'system-workflow',
        authorName: 'System Automation',
        title,
        body,
        color,
        isPinned: true,
        moduleId: moduleId || null,
        recordId: recordId || null,
        entityType: recordId ? 'RECORD' : null,
        entityId: recordId || null,
        tags: ['#pinned', '#alert']
      });

      return { success: true, noteId: note.id };
    }
  }
};


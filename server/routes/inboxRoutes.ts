import { Router, Request, Response } from 'express';
import { SmtpClient, ImapClient, autoDetectEmailSettings, EmailServerConfig, ParsedEmail, SendEmailPayload } from '../services/emailEngine';
import { globalPrisma } from '../lib/prisma';
import * as crypto from 'crypto';

const router = Router();

export interface EmailAccountRecord {
  id: string;
  tenantId: string;
  userId?: string;
  email: string;
  name: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'custom' | 'shared';
  type: 'PERSONAL' | 'SHARED';
  color: string;
  config: EmailServerConfig;
  status: 'CONNECTED' | 'SYNCING' | 'ERROR';
  errorMessage?: string;
  lastSyncedAt?: string;
  unreadCount?: number;
  sharedMembers?: string[];
  createdAt: string;
}

export interface EmailThreadRecord {
  id: string;
  tenantId: string;
  accountId: string;
  subject: string;
  snippet: string;
  from: { name: string; address: string; avatarUrl?: string };
  to: { name: string; address: string; avatarUrl?: string }[];
  cc?: { name: string; address: string }[];
  timestamp: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  status?: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  labels: string[];
  messages: any[];
  linkedRecords?: any[];
  internalNotes?: any[];
  aiInsights?: any;
}

// In-Memory fallback cache in case of database offline
const accountsStore: Map<string, EmailAccountRecord[]> = new Map();
const threadsStore: Map<string, EmailThreadRecord[]> = new Map();
const seededTenants: Set<string> = new Set();

/**
 * Ensure database is seeded for tenant on first load
 */
async function ensureTenantDbSeed(tenantId: string) {
  if (seededTenants.has(tenantId)) return;
  
  try {
    const accountCount = await globalPrisma.inboxAccount.count({ where: { tenantId } });
    if (accountCount === 0) {
      // 1. Create Initial Accounts
      const supportAcc = await globalPrisma.inboxAccount.create({
        data: {
          id: `acc_shared_support_${tenantId}`,
          tenantId,
          name: 'Customer Support (Shared)',
          email: 'support@aurora.internal',
          provider: 'IMAP',
          isShared: true,
          status: 'CONNECTED',
          config: { email: 'support@aurora.internal', provider: 'shared', color: '#3B82F6' }
        }
      });

      const salesAcc = await globalPrisma.inboxAccount.create({
        data: {
          id: `acc_shared_sales_${tenantId}`,
          tenantId,
          name: 'Sales & Growth (Shared)',
          email: 'sales@aurora.internal',
          provider: 'IMAP',
          isShared: true,
          status: 'CONNECTED',
          config: { email: 'sales@aurora.internal', provider: 'shared', color: '#10B981' }
        }
      });

      const now = new Date();

      // 2. Create Initial Threads with Messages & Attachments
      const th1 = await globalPrisma.inboxThread.create({
        data: {
          id: `th_01_${tenantId}`,
          tenantId,
          accountId: supportAcc.id,
          subject: 'URGENT: Enterprise SLA Request & Workflow Integration Question',
          snippet: 'Hi team, we are evaluating Aurora for 250 users and need assistance with the automated custom records pipeline.',
          folder: 'inbox',
          isRead: false,
          isStarred: true,
          status: 'OPEN',
          assignedTo: 'AI Triage Agent',
          labels: ['High Priority', 'Enterprise', 'Customer Care'],
          lastActivityAt: new Date(now.getTime() - 15 * 60 * 1000),
          messages: {
            create: [
              {
                id: `msg_01_1_${tenantId}`,
                senderName: 'Elena Rostova',
                senderEmail: 'elena.rostova@apexlogistics.com',
                toRecipients: [{ name: 'Aurora Support', address: 'support@aurora.internal' }],
                subject: 'URGENT: Enterprise SLA Request & Workflow Integration Question',
                bodyText: 'Hello Aurora Support,\n\nWe are currently testing your platform for our logistics division (250 members). We noticed your People & Organisations taxonomy supports custom fields. Can you confirm if incoming emails can automatically create records in our custom "Logistics Claims" module?\n\nAlso, we would like to know if we can configure multi-step approval workflows for high-value claims above $10,000.\n\nBest regards,\nElena Rostova\nHead of Operations, Apex Logistics',
                bodyHtml: '<p>Hello Aurora Support,</p><p>We are currently testing your platform for our logistics division (250 members). We noticed your People & Organisations taxonomy supports custom fields. Can you confirm if incoming emails can automatically create records in our custom <strong>"Logistics Claims"</strong> module?</p><p>Also, we would like to know if we can configure multi-step approval workflows for high-value claims above $10,000.</p><br/><p>Best regards,<br/><strong>Elena Rostova</strong><br/>Head of Operations, Apex Logistics</p>',
                snippet: 'We are currently testing your platform for our logistics division (250 members)...',
                flags: ['\\Flagged'],
                sentAt: new Date(now.getTime() - 15 * 60 * 1000),
                attachments: {
                  create: [
                    {
                      id: `att_01_${tenantId}`,
                      filename: 'Apex_Workflow_Requirements_v2.pdf',
                      contentType: 'application/pdf',
                      size: 245000
                    }
                  ]
                }
              }
            ]
          },
          internalNotes: {
            create: [
              {
                id: `note_01_${tenantId}`,
                authorId: 'agent_triage',
                authorName: 'AI Triage Agent',
                authorEmail: 'agent@aurora.internal',
                content: 'Detected Enterprise Lead (250 seats) from Apex Logistics. Recommended converting this email to a Sales Opportunity or Support Ticket record.'
              }
            ]
          }
        }
      });

      await globalPrisma.inboxThread.create({
        data: {
          id: `th_02_${tenantId}`,
          tenantId,
          accountId: salesAcc.id,
          subject: 'Partnership Quote & Custom Module Schema Review',
          snippet: 'Thanks for the demo call yesterday! Could you please send over the pricing catalog breakdown for standard vs developer seats?',
          folder: 'inbox',
          isRead: true,
          isStarred: false,
          status: 'OPEN',
          assignedTo: 'Sarah Jenkins',
          labels: ['Sales Deal', 'Pricing'],
          lastActivityAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          messages: {
            create: [
              {
                id: `msg_02_1_${tenantId}`,
                senderName: 'Marcus Sterling',
                senderEmail: 'm.sterling@sterlingcorp.global',
                toRecipients: [{ name: 'Aurora Sales', address: 'sales@aurora.internal' }],
                subject: 'Partnership Quote & Custom Module Schema Review',
                bodyText: 'Hi Sarah,\n\nThanks for the demo call yesterday! Could you please send over the pricing catalog breakdown for standard vs developer seats? We are planning our Q4 deployment.\n\nWarm regards,\nMarcus Sterling',
                bodyHtml: '<p>Hi Sarah,</p><p>Thanks for the demo call yesterday! Could you please send over the pricing catalog breakdown for standard vs developer seats? We are planning our Q4 deployment.</p><br/><p>Warm regards,<br/><strong>Marcus Sterling</strong></p>',
                snippet: 'Thanks for the demo call yesterday! Could you please send over the pricing catalog breakdown...',
                flags: ['\\Seen'],
                sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
              }
            ]
          }
        }
      });

      await globalPrisma.inboxThread.create({
        data: {
          id: `th_03_${tenantId}`,
          tenantId,
          accountId: supportAcc.id,
          subject: 'API Rate Limits and Webhook Delivery Guarantees',
          snippet: 'We are connecting our internal ERP to Aurora webhooks. What is the retry backoff policy for HTTP 500 responses?',
          folder: 'inbox',
          isRead: true,
          isStarred: true,
          status: 'OPEN',
          assignedTo: 'Engineering AI Bot',
          labels: ['Technical', 'API'],
          lastActivityAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
          messages: {
            create: [
              {
                id: `msg_03_1_${tenantId}`,
                senderName: 'Dr. Jonathan Hayes',
                senderEmail: 'j.hayes@quantumgrid.io',
                toRecipients: [{ name: 'Aurora Support', address: 'support@aurora.internal' }],
                subject: 'API Rate Limits and Webhook Delivery Guarantees',
                bodyText: 'Greetings Support,\n\nWe are planning to dispatch roughly 40,000 transaction events/hour to Aurora custom modules. Could you please confirm the concurrency threshold per workspace tenant?\n\nSincerely,\nDr. Jonathan Hayes',
                bodyHtml: '<p>Greetings Support,</p><p>We are planning to dispatch roughly 40,000 transaction events/hour to Aurora custom modules. Could you please confirm the concurrency threshold per workspace tenant?</p><br/><p>Sincerely,<br/><strong>Dr. Jonathan Hayes</strong></p>',
                snippet: 'We are planning to dispatch roughly 40,000 transaction events/hour...',
                flags: ['\\Seen', '\\Flagged'],
                sentAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
              }
            ]
          }
        }
      });

      // 3. Create Seed Folders
      await globalPrisma.inboxFolder.createMany({
        data: [
          { id: `folder_clients_${tenantId}`, tenantId, name: 'VIP Clients', color: 'bg-emerald-500', icon: 'Folder' },
          { id: `folder_invoices_${tenantId}`, tenantId, name: 'Invoices & Billing', color: 'bg-amber-500', icon: 'FileText' },
          { id: `folder_legal_${tenantId}`, tenantId, name: 'Contracts & Legal', color: 'bg-indigo-500', icon: 'Shield' }
        ]
      });

      // 4. Create Seed Snippets
      await globalPrisma.inboxSnippet.createMany({
        data: [
          {
            id: `snip_intro_${tenantId}`,
            tenantId,
            title: 'Meeting Introduction',
            shortcut: '/intro',
            category: 'General',
            content: 'Hi there,\n\nThanks for reaching out to us. I would love to schedule a quick 15-minute call to discuss your requirements and how Aurora can help.\n\nBest regards,\n{{user.name}}'
          },
          {
            id: `snip_pricing_${tenantId}`,
            tenantId,
            title: 'Enterprise Pricing Overview',
            shortcut: '/pricing',
            category: 'Sales',
            content: 'Hi,\n\nOur Enterprise tier includes dedicated workspace pods, custom AI agents, unlimited shared inboxes, and 24/7 SLA support. Let me know if you would like a customized proposal.\n\nCheers,\n{{user.name}}'
          },
          {
            id: `snip_support_${tenantId}`,
            tenantId,
            title: 'Ticket Escalation Notice',
            shortcut: '/escalate',
            category: 'Support',
            content: 'Hello,\n\nI have escalated this ticket to our senior engineering squad for priority investigation. We will update you with our findings within 2 business hours.\n\nThank you for your patience,\nAurora Support Team'
          }
        ]
      });

      // 5. Create Default Signature
      await globalPrisma.inboxSignature.create({
        data: {
          id: `sig_default_${tenantId}`,
          tenantId,
          name: 'Standard Aurora Corporate Signature',
          contentHtml: `<div style="font-family: sans-serif; font-size: 13px; color: #374151; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 12px;">
  <strong>Aurora Operations</strong><br/>
  <span style="color: #6B7280;">Next-Gen Enterprise Cloud & AI Platform</span><br/>
  <a href="https://aurora.internal" style="color: #4F46E5; text-decoration: none;">aurora.internal</a>
</div>`,
          contentText: '\n--\nAurora Operations\nNext-Gen Enterprise Cloud & AI Platform\nhttps://aurora.internal',
          isDefault: true
        }
      });
    }
  } catch (err) {
    console.warn('[InboxDBSeed] Prisma seeding fallback error:', err);
  } finally {
    seededTenants.add(tenantId);
  }
}

/**
 * Format Prisma InboxThread entity to client EmailThread structure
 */
function formatThreadModel(th: any): any {
  const messages = (th.messages || []).map((m: any) => ({
    id: m.id,
    messageId: m.messageId,
    from: { name: m.senderName, address: m.senderEmail, avatarUrl: m.senderAvatarUrl },
    to: Array.isArray(m.toRecipients) ? m.toRecipients : [],
    cc: Array.isArray(m.ccRecipients) ? m.ccRecipients : [],
    bcc: Array.isArray(m.bccRecipients) ? m.bccRecipients : [],
    subject: m.subject,
    date: m.sentAt ? m.sentAt.toISOString() : new Date().toISOString(),
    bodyText: m.bodyText || '',
    bodyHtml: m.bodyHtml || `<p>${m.bodyText || ''}</p>`,
    snippet: m.snippet || (m.bodyText || '').substring(0, 140),
    flags: Array.isArray(m.flags) ? m.flags : ['\\Seen'],
    attachments: (m.attachments || []).map((a: any) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      driveFileId: a.driveFileId,
      url: a.url
    }))
  }));

  const firstMsg = messages[0];
  const lastMsg = messages[messages.length - 1];

  return {
    id: th.id,
    tenantId: th.tenantId,
    accountId: th.accountId,
    subject: th.subject,
    snippet: th.snippet || lastMsg?.snippet || '',
    from: firstMsg ? firstMsg.from : { name: 'Sender', address: 'noreply@aurora.internal' },
    to: firstMsg ? firstMsg.to : [],
    timestamp: th.lastActivityAt ? th.lastActivityAt.toISOString() : (lastMsg?.date || new Date().toISOString()),
    folder: th.folder,
    isRead: th.isRead,
    isStarred: th.isStarred,
    isSnoozed: th.isSnoozed,
    snoozedUntil: th.snoozedUntil ? th.snoozedUntil.toISOString() : undefined,
    status: th.status || 'OPEN',
    assignedTo: th.assignedTo,
    labels: Array.isArray(th.labels) ? th.labels : [],
    linkedRecords: Array.isArray(th.linkedRecords) ? th.linkedRecords : [],
    aiInsights: th.aiInsights || undefined,
    messages,
    internalNotes: (th.internalNotes || []).map((n: any) => ({
      id: n.id,
      authorId: n.authorId,
      authorName: n.authorName,
      authorEmail: n.authorEmail,
      authorAvatar: n.authorAvatar,
      content: n.content,
      createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString()
    }))
  };
}

/**
 * GET /api/inbox/accounts
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    await ensureTenantDbSeed(tenantId);

    const dbAccounts = await globalPrisma.inboxAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    const accounts = dbAccounts.map(a => {
      const cfg = (a.config as any) || {};
      return {
        id: a.id,
        tenantId: a.tenantId,
        name: a.name,
        email: a.email,
        provider: a.provider.toLowerCase(),
        type: a.isShared ? 'SHARED' : 'PERSONAL',
        color: cfg.color || '#6366F1',
        status: a.status,
        config: {
          ...cfg,
          email: a.email,
          password: cfg.password ? '••••••••' : undefined
        },
        createdAt: a.createdAt.toISOString()
      };
    });

    res.json({ accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/accounts
 */
router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { email, name, password: directPassword, provider, type, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, color, config: nestedConfig } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const password = directPassword || nestedConfig?.password;
    const auto = autoDetectEmailSettings(email);
    const fullConfig: EmailServerConfig = {
      email,
      name: name || email.split('@')[0],
      password,
      provider: provider || auto.provider || 'custom',
      imapHost: imapHost || nestedConfig?.imapHost || auto.imapHost,
      imapPort: imapPort || nestedConfig?.imapPort || auto.imapPort,
      imapSecure: imapSecure !== undefined ? imapSecure : (nestedConfig?.imapSecure !== undefined ? nestedConfig.imapSecure : auto.imapSecure),
      smtpHost: smtpHost || nestedConfig?.smtpHost || auto.smtpHost,
      smtpPort: smtpPort || nestedConfig?.smtpPort || auto.smtpPort,
      smtpSecure: smtpSecure !== undefined ? smtpSecure : (nestedConfig?.smtpSecure !== undefined ? nestedConfig.smtpSecure : auto.smtpSecure),
    };

    const newAcc = await globalPrisma.inboxAccount.create({
      data: {
        id: `acc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        tenantId,
        email,
        name: name || email.split('@')[0],
        provider: (provider || 'IMAP').toUpperCase(),
        isShared: type === 'SHARED',
        status: 'CONNECTED',
        config: { ...fullConfig, color: color || '#6366F1' }
      }
    });

    res.json({
      account: {
        id: newAcc.id,
        tenantId: newAcc.tenantId,
        email: newAcc.email,
        name: newAcc.name,
        provider: newAcc.provider.toLowerCase(),
        type: newAcc.isShared ? 'SHARED' : 'PERSONAL',
        color: color || '#6366F1',
        config: { ...fullConfig, password: '••••••••' },
        status: newAcc.status,
        createdAt: newAcc.createdAt.toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/inbox/accounts/:id
 */
router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    await globalPrisma.inboxAccount.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/inbox/threads/:id
 */
router.delete('/threads/:id', async (req: Request, res: Response) => {
  try {
    const threadWithMsgs = await globalPrisma.inboxThread.findUnique({
      where: { id: req.params.id },
      include: { messages: true, account: true }
    });

    if (threadWithMsgs) {
      const accCfg = threadWithMsgs.account?.config as any;
      if (accCfg && accCfg.imapHost && accCfg.password && !accCfg.password.startsWith('••')) {
        const client = new ImapClient(accCfg);
        const firstMsg = threadWithMsgs.messages[0];
        client.deleteMessage({
          messageId: firstMsg?.messageId || undefined,
          subject: threadWithMsgs.subject
        }).catch(() => {});
      }
    }

    await globalPrisma.inboxThread.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/accounts/:id/sync
 */
router.post('/accounts/:id/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    await ensureTenantDbSeed(tenantId);

    let account = await globalPrisma.inboxAccount.findUnique({
      where: { id: req.params.id }
    });

    if (!account) {
      account = await globalPrisma.inboxAccount.findFirst({
        where: { tenantId }
      });
    }

    if (!account) {
      return res.json({ success: true, newMessagesCount: 0 });
    }

    if (req.query.reparse === 'true') {
      await globalPrisma.inboxThread.deleteMany({
        where: { accountId: account.id }
      });
    }

    let newCount = 0;
    const newThreads: any[] = [];
    const cfg = account.config as any;

    // 1. If password/IMAP config exists, attempt live IMAP fetch
    if (cfg && cfg.imapHost && cfg.password && !cfg.password.startsWith('••')) {
      try {
        const client = new ImapClient(cfg);
        const fetchedEmails = await client.fetchRecentMessages('INBOX', 50);
        if (Array.isArray(fetchedEmails)) {
          const remoteMessageIds = new Set<string>();
          const remoteSubjects = new Set<string>();

          for (const msg of fetchedEmails) {
            if (msg.messageId) remoteMessageIds.add(msg.messageId);
            if (msg.id) remoteMessageIds.add(msg.id);
            if (msg.subject) remoteSubjects.add(msg.subject.trim());

            const exists = await globalPrisma.inboxMessage.findFirst({
              where: {
                OR: [
                  ...(msg.messageId ? [{ messageId: msg.messageId }] : []),
                  { subject: msg.subject, senderEmail: msg.from?.address || 'unknown' }
                ]
              }
            });

            if (!exists) {
              const now = new Date(msg.date || Date.now());
              const threadId = `th_${msg.id}_${Date.now()}`;
              newThreads.push({
                threadId,
                subject: msg.subject || 'No Subject',
                senderName: msg.from?.name || msg.from?.address || 'Unknown',
                senderEmail: msg.from?.address || 'unknown@domain.com',
                snippet: msg.snippet || '',
                accountName: account.name,
                accountEmail: account.email
              });

              await globalPrisma.inboxThread.create({
                data: {
                  id: threadId,
                  tenantId,
                  accountId: account.id,
                  subject: msg.subject || 'No Subject',
                  snippet: msg.snippet || '',
                  folder: 'inbox',
                  isRead: false,
                  isStarred: false,
                  status: 'OPEN',
                  labels: ['Synced'],
                  lastActivityAt: now,
                  messages: {
                    create: [
                      {
                        id: msg.id,
                        messageId: msg.messageId || msg.id,
                        senderName: msg.from?.name || msg.from?.address || 'Unknown',
                        senderEmail: msg.from?.address || 'unknown@domain.com',
                        toRecipients: msg.to || [],
                        ccRecipients: msg.cc || [],
                        subject: msg.subject || 'No Subject',
                        bodyText: msg.bodyText || '',
                        bodyHtml: msg.bodyHtml || `<p>${msg.bodyText}</p>`,
                        snippet: msg.snippet || '',
                        sentAt: now,
                        attachments: {
                          create: (msg.attachments || []).map(a => ({
                            id: a.id || `att_${Date.now()}_${Math.random()}`,
                            filename: a.filename,
                            contentType: a.contentType,
                            size: a.size,
                            contentBase64: a.contentBase64
                          }))
                        }
                      }
                    ]
                  }
                }
              });
              newCount++;
            } else {
              // Update existing message with cleanly decoded body & snippet
              await globalPrisma.inboxMessage.update({
                where: { id: exists.id },
                data: {
                  bodyHtml: msg.bodyHtml || `<p>${msg.bodyText}</p>`,
                  bodyText: msg.bodyText || '',
                  snippet: msg.snippet || ''
                }
              });
              await globalPrisma.inboxThread.update({
                where: { id: exists.threadId },
                data: {
                  subject: msg.subject || 'No Subject',
                  snippet: msg.snippet || ''
                }
              });
            }
          }

          // Two-Way Sync: Reconcile deleted threads from Gmail INBOX
          const currentInboxThreads = await globalPrisma.inboxThread.findMany({
            where: {
              accountId: account.id,
              folder: 'inbox',
              NOT: {
                id: { startsWith: 'th_sent_' }
              }
            },
            include: { messages: true }
          });

          for (const thread of currentInboxThreads) {
            const hasRemoteMatch = thread.messages.some(m => 
              (m.messageId && remoteMessageIds.has(m.messageId)) ||
              (m.id && remoteMessageIds.has(m.id))
            ) || remoteSubjects.has(thread.subject.trim());

            if (!hasRemoteMatch) {
              await globalPrisma.inboxThread.update({
                where: { id: thread.id },
                data: { folder: 'trash' }
              });
            }
          }
        }
      } catch (imapErr: any) {
        console.warn(`[InboxSync] IMAP connection attempt for ${account.email}:`, imapErr.message);
      }
    }

    // 2. If no threads exist yet for this account, create initial connected mailbox thread
    const existingThreadCount = await globalPrisma.inboxThread.count({
      where: { accountId: account.id }
    });

    if (existingThreadCount === 0) {
      const now = new Date();
      await globalPrisma.inboxThread.create({
        data: {
          id: `th_welcome_${account.id}_${Date.now()}`,
          tenantId,
          accountId: account.id,
          subject: `Welcome to Aurora Inbox: ${account.name}`,
          snippet: `Your mailbox (${account.email}) is successfully linked to Aurora.`,
          folder: 'inbox',
          isRead: false,
          isStarred: true,
          status: 'OPEN',
          labels: ['Inbox', 'Account Connected'],
          lastActivityAt: now,
          messages: {
            create: [
              {
                id: `msg_welcome_${Date.now()}`,
                senderName: 'Aurora System',
                senderEmail: 'system@aurora.internal',
                toRecipients: [{ name: account.name, address: account.email }],
                subject: `Welcome to Aurora Inbox: ${account.name}`,
                bodyText: `Hello ${account.name},\n\nYour email account (${account.email}) has been successfully connected to Aurora.\n\nBest regards,\nAurora Platform Team`,
                bodyHtml: `<div style="font-family: sans-serif; font-size: 14px; color: #1F2937; line-height: 1.6;">
                  <p>Hello <strong>${account.name}</strong>,</p>
                  <p>Your email account (<strong>${account.email}</strong>) has been successfully connected to Aurora.</p>
                  <p>You can now send and receive messages directly from Aurora, utilize Gemini AI triage, and convert conversations into custom CRM and ERP records.</p>
                  <p style="color: #4F46E5; font-weight: bold;">Aurora Platform Team</p>
                </div>`,
                snippet: `Your mailbox (${account.email}) is successfully linked to Aurora.`,
                sentAt: now
              }
            ]
          }
        }
      });
      newCount++;
    }

    await globalPrisma.inboxAccount.update({
      where: { id: account.id },
      data: {
        config: {
          ...(typeof account.config === 'object' && account.config ? account.config : {}),
          lastSyncedAt: new Date().toISOString()
        }
      }
    });

    res.json({ success: true, newMessagesCount: newCount, newThreads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inbox/threads
 */
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { accountId, folder, search, label, isStarred } = req.query;

    await ensureTenantDbSeed(tenantId);

    const whereClause: any = { tenantId };

    if (accountId && accountId !== 'all') {
      whereClause.accountId = accountId as string;
    }

    if (folder) {
      if (folder === 'starred') {
        whereClause.isStarred = true;
        whereClause.folder = { not: 'trash' };
      } else {
        whereClause.folder = folder as string;
      }
    }

    if (isStarred === 'true') {
      whereClause.isStarred = true;
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { snippet: { contains: q, mode: 'insensitive' } }
      ];
    }

    const dbThreads = await globalPrisma.inboxThread.findMany({
      where: whereClause,
      include: {
        messages: {
          include: { attachments: true },
          orderBy: { sentAt: 'asc' }
        },
        internalNotes: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { lastActivityAt: 'desc' }
    });

    let threads = dbThreads.map(formatThreadModel);

    if (label) {
      threads = threads.filter(t => t.labels && t.labels.includes(label as string));
    }

    res.json({ threads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inbox/threads/:id
 */
router.get('/threads/:id', async (req: Request, res: Response) => {
  try {
    const dbThread = await globalPrisma.inboxThread.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          include: { attachments: true },
          orderBy: { sentAt: 'asc' }
        },
        internalNotes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!dbThread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json({ thread: formatThreadModel(dbThread) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/send
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, threadId, attachments, fromName, fromEmail, fromAvatarUrl } = req.body;

    if (!to || !to.length) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    await ensureTenantDbSeed(tenantId);

    const dbAccount = accountId 
      ? await globalPrisma.inboxAccount.findUnique({ where: { id: accountId } })
      : await globalPrisma.inboxAccount.findFirst({ where: { tenantId } });

    const senderName = fromName || dbAccount?.name || 'Aurora Workspace User';
    const senderEmail = fromEmail || dbAccount?.email || 'user@aurora.internal';
    const senderAvatar = fromAvatarUrl;

    const toRecipients = (Array.isArray(to) ? to : [to]).map((t: string) => ({ name: t.split('@')[0], address: t }));
    const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]).map((c: string) => ({ name: c.split('@')[0], address: c })) : [];
    const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]).map((b: string) => ({ name: b.split('@')[0], address: b })) : [];

    const now = new Date();
    const sentSnippet = (bodyText || subject || 'Message').substring(0, 140);
    const rawHtml = bodyHtml || `<p>${bodyText || ''}</p>`;
    const rawText = bodyText || bodyHtml?.replace(/<[^>]+>/g, '') || '';

    // Live outbound SMTP dispatch if account has SMTP configuration & credentials
    const cfg = dbAccount?.config as any;
    let liveSmtpDispatched = false;

    if (cfg && cfg.smtpHost && cfg.password && !cfg.password.startsWith('••')) {
      try {
        const smtp = new SmtpClient(cfg);
        const smtpResult = await smtp.sendEmail({
          from: senderEmail,
          fromName: senderName,
          to: toRecipients.map(t => t.address),
          cc: ccRecipients.map(c => c.address),
          bcc: bccRecipients.map(b => b.address),
          subject: subject || 'No Subject',
          bodyHtml: rawHtml,
          bodyText: rawText,
          attachments: (attachments || []).map((a: any) => ({
            filename: a.filename,
            contentType: a.contentType,
            contentBase64: a.contentBase64
          }))
        });

        if (!smtpResult.success) {
          return res.status(502).json({
            error: `Failed to send email via SMTP (${cfg.smtpHost}): ${smtpResult.error || 'Authentication or relay error'}`
          });
        }
        liveSmtpDispatched = true;
      } catch (smtpErr: any) {
        return res.status(502).json({
          error: `SMTP Dispatch Error: ${smtpErr.message}`
        });
      }
    }

    let resolvedThreadId = threadId;

    if (resolvedThreadId) {
      // 1. Append message to existing thread
      const newMsg = await globalPrisma.inboxMessage.create({
        data: {
          id: `msg_sent_${Date.now()}`,
          threadId: resolvedThreadId,
          senderName,
          senderEmail,
          senderAvatarUrl: senderAvatar,
          toRecipients,
          ccRecipients,
          bccRecipients,
          subject: subject || 'No Subject',
          bodyText: rawText,
          bodyHtml: rawHtml,
          snippet: sentSnippet,
          flags: ['\\Seen'],
          sentAt: now,
          attachments: {
            create: (attachments || []).map((a: any, i: number) => ({
              id: `att_${Date.now()}_${i}`,
              filename: a.filename,
              contentType: a.contentType,
              size: Math.round((a.contentBase64?.length || 0) * 0.75),
              contentBase64: a.contentBase64
            }))
          }
        }
      });

      // Update thread activity
      await globalPrisma.inboxThread.update({
        where: { id: resolvedThreadId },
        data: {
          lastActivityAt: now,
          snippet: sentSnippet
        }
      });

      return res.json({
        success: true,
        messageId: newMsg.id,
        message: {
          id: newMsg.id,
          from: { name: senderName, address: senderEmail, avatarUrl: senderAvatar },
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: newMsg.subject,
          date: now.toISOString(),
          bodyText: rawText,
          bodyHtml: rawHtml,
          snippet: sentSnippet,
          flags: ['\\Seen'],
          attachments: attachments || []
        }
      });
    } else {
      // 2. Create brand new thread
      const isSelfSend = toRecipients.some((t: any) => t.address.toLowerCase() === senderEmail.toLowerCase());
      const targetFolder = isSelfSend ? 'inbox' : 'sent';
      const targetLabels = isSelfSend ? ['Inbox', 'Sent'] : ['Sent'];

      const createdThread = await globalPrisma.inboxThread.create({
        data: {
          id: `th_sent_${Date.now()}`,
          tenantId,
          accountId: dbAccount?.id || `acc_shared_support_${tenantId}`,
          subject: subject || 'No Subject',
          snippet: sentSnippet,
          folder: targetFolder,
          isRead: !isSelfSend,
          isStarred: false,
          status: 'OPEN',
          labels: targetLabels,
          lastActivityAt: now,
          messages: {
            create: [
              {
                id: `msg_sent_${Date.now()}`,
                senderName,
                senderEmail,
                senderAvatarUrl: senderAvatar,
                toRecipients,
                ccRecipients,
                bccRecipients,
                subject: subject || 'No Subject',
                bodyText: rawText,
                bodyHtml: rawHtml,
                snippet: sentSnippet,
                flags: ['\\Seen'],
                sentAt: now,
                attachments: {
                  create: (attachments || []).map((a: any, i: number) => ({
                    id: `att_${Date.now()}_${i}`,
                    filename: a.filename,
                    contentType: a.contentType,
                    size: Math.round((a.contentBase64?.length || 0) * 0.75),
                    contentBase64: a.contentBase64
                  }))
                }
              }
            ]
          }
        },
        include: {
          messages: { include: { attachments: true } }
        }
      });

      return res.json({
        success: true,
        threadId: createdThread.id,
        thread: formatThreadModel(createdThread)
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/inbox/threads/:id/actions
 */
router.patch('/threads/:id/actions', async (req: Request, res: Response) => {
  try {
    const { action, value, label } = req.body;
    const { id } = req.params;

    const existing = await globalPrisma.inboxThread.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const updateData: any = {};

    switch (action) {
      case 'markRead':
        updateData.isRead = value !== undefined ? !!value : true;
        break;
      case 'star':
        updateData.isStarred = value !== undefined ? !!value : true;
        break;
      case 'archive':
        updateData.folder = 'archive';
        break;
      case 'trash':
        updateData.folder = 'trash';
        // Two-way live IMAP deletion from remote mailbox
        try {
          const threadWithMsgs = await globalPrisma.inboxThread.findUnique({
            where: { id },
            include: { messages: true, account: true }
          });
          const accCfg = threadWithMsgs?.account?.config as any;
          if (accCfg && accCfg.imapHost && accCfg.password && !accCfg.password.startsWith('••')) {
            const client = new ImapClient(accCfg);
            const firstMsg = threadWithMsgs?.messages[0];
            client.deleteMessage({
              messageId: firstMsg?.messageId || undefined,
              subject: threadWithMsgs?.subject
            }).catch(() => {});
          }
        } catch (_) {}
        break;
      case 'snooze':
        updateData.folder = 'snoozed';
        updateData.isSnoozed = true;
        updateData.snoozedUntil = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        break;
      case 'moveToInbox':
        updateData.folder = 'inbox';
        updateData.isSnoozed = false;
        break;
      case 'addLabel':
        if (label) {
          const currentLabels = Array.isArray(existing.labels) ? (existing.labels as string[]) : [];
          if (!currentLabels.includes(label)) {
            updateData.labels = [...currentLabels, label];
          }
        }
        break;
      case 'removeLabel':
        if (label) {
          const currentLabels = Array.isArray(existing.labels) ? (existing.labels as string[]) : [];
          updateData.labels = currentLabels.filter(l => l !== label);
        }
        break;
      case 'updateSharedStatus':
        updateData.status = value;
        break;
      case 'assign':
        updateData.assignedTo = value;
        break;
    }

    const updated = await globalPrisma.inboxThread.update({
      where: { id },
      data: updateData,
      include: {
        messages: { include: { attachments: true }, orderBy: { sentAt: 'asc' } },
        internalNotes: true
      }
    });

    res.json({ success: true, thread: formatThreadModel(updated) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/assign
 */
router.post('/threads/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const updated = await globalPrisma.inboxThread.update({
      where: { id },
      data: { assignedTo: assignedTo || null },
      include: {
        messages: { include: { attachments: true }, orderBy: { sentAt: 'asc' } },
        internalNotes: true
      }
    });

    res.json({ success: true, thread: formatThreadModel(updated) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/status
 */
router.post('/threads/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sharedStatus, status } = req.body;

    const newStatus = sharedStatus || status || 'OPEN';

    const updated = await globalPrisma.inboxThread.update({
      where: { id },
      data: { status: newStatus },
      include: {
        messages: { include: { attachments: true }, orderBy: { sentAt: 'asc' } },
        internalNotes: true
      }
    });

    res.json({ success: true, thread: formatThreadModel(updated) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/snooze
 */
router.post('/threads/:id/snooze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { snoozedUntil } = req.body;

    const updated = await globalPrisma.inboxThread.update({
      where: { id },
      data: {
        isSnoozed: true,
        snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : new Date(Date.now() + 86400000),
        folder: 'snoozed'
      },
      include: {
        messages: { include: { attachments: true }, orderBy: { sentAt: 'asc' } },
        internalNotes: true
      }
    });

    res.json({ success: true, thread: formatThreadModel(updated) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/notes
 */
router.post('/threads/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { authorId, authorName, authorEmail, content, authorAvatar } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = await globalPrisma.inboxInternalNote.create({
      data: {
        id: `note_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        threadId: id,
        authorId: authorId || 'user',
        authorName: authorName || 'Team Member',
        authorEmail: authorEmail || 'user@aurora.internal',
        authorAvatar,
        content
      }
    });

    res.json({
      success: true,
      note: {
        id: note.id,
        authorId: note.authorId,
        authorName: note.authorName,
        authorEmail: note.authorEmail,
        authorAvatar: note.authorAvatar,
        content: note.content,
        createdAt: note.createdAt.toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/convert
 */
router.post('/threads/:id/convert', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { moduleId, moduleName, recordKey, title, recordId } = req.body;

    const existing = await globalPrisma.inboxThread.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Thread not found' });

    const linkedRecords = Array.isArray(existing.linkedRecords) ? (existing.linkedRecords as any[]) : [];
    const labels = Array.isArray(existing.labels) ? (existing.labels as string[]) : [];

    const newRecord = {
      id: recordId || `rec_${Date.now()}`,
      moduleId: moduleId || 'mod_tickets',
      moduleName: moduleName || 'Module Record',
      recordKey: recordKey || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title || existing.subject,
      createdAt: new Date().toISOString()
    };

    linkedRecords.push(newRecord);
    if (!labels.includes('Converted to Record')) {
      labels.push('Converted to Record');
    }

    await globalPrisma.inboxThread.update({
      where: { id },
      data: {
        linkedRecords,
        labels
      }
    });

    res.json({ success: true, linkedRecord: newRecord });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET & POST /api/inbox/custom-folders
 */
router.get('/custom-folders', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    await ensureTenantDbSeed(tenantId);

    const folders = await globalPrisma.inboxFolder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(folders.map(f => ({
      id: f.id,
      tenantId: f.tenantId,
      name: f.name,
      color: f.color,
      icon: f.icon,
      createdAt: f.createdAt.toISOString()
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/custom-folders', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const newFolder = await globalPrisma.inboxFolder.create({
      data: {
        id: `folder_${Date.now()}`,
        tenantId,
        name,
        color: color || 'bg-blue-500',
        icon: icon || 'Folder'
      }
    });

    res.json({
      id: newFolder.id,
      tenantId: newFolder.tenantId,
      name: newFolder.name,
      color: newFolder.color,
      icon: newFolder.icon,
      createdAt: newFolder.createdAt.toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/custom-folders/:id', async (req: Request, res: Response) => {
  try {
    await globalPrisma.inboxFolder.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET & POST & DELETE /api/inbox/snippets
 */
router.get('/snippets', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    await ensureTenantDbSeed(tenantId);

    const snippets = await globalPrisma.inboxSnippet.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      snippets: snippets.map(s => ({
        id: s.id,
        tenantId: s.tenantId,
        title: s.title,
        shortcut: s.shortcut,
        category: s.category,
        content: s.content,
        contentHtml: s.contentHtml,
        createdAt: s.createdAt.toISOString()
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/snippets', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { id, title, shortcut, category, content, contentHtml } = req.body;

    const formattedShortcut = shortcut?.startsWith('/') ? shortcut : `/${shortcut || 'snippet'}`;

    let snippet;
    if (id && !id.startsWith('snip_new_')) {
      snippet = await globalPrisma.inboxSnippet.upsert({
        where: { id },
        update: {
          title: title || 'Untitled Snippet',
          shortcut: formattedShortcut,
          category: category || 'General',
          content: content || '',
          contentHtml
        },
        create: {
          id: id || `snip_${Date.now()}`,
          tenantId,
          title: title || 'Untitled Snippet',
          shortcut: formattedShortcut,
          category: category || 'General',
          content: content || '',
          contentHtml
        }
      });
    } else {
      snippet = await globalPrisma.inboxSnippet.create({
        data: {
          id: `snip_${Date.now()}`,
          tenantId,
          title: title || 'Untitled Snippet',
          shortcut: formattedShortcut,
          category: category || 'General',
          content: content || '',
          contentHtml
        }
      });
    }

    res.json({ snippet });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/snippets/:id', async (req: Request, res: Response) => {
  try {
    await globalPrisma.inboxSnippet.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET & POST & DELETE /api/inbox/signatures
 */
router.get('/signatures', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    await ensureTenantDbSeed(tenantId);

    const signatures = await globalPrisma.inboxSignature.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      signatures: signatures.map(s => ({
        id: s.id,
        tenantId: s.tenantId,
        accountId: s.accountId,
        name: s.name,
        contentHtml: s.contentHtml,
        contentText: s.contentText,
        isDefault: s.isDefault,
        createdAt: s.createdAt.toISOString()
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/signatures', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { id, accountId, name, contentHtml, contentText, isDefault } = req.body;

    let sig;
    if (id && !id.startsWith('sig_new_')) {
      sig = await globalPrisma.inboxSignature.upsert({
        where: { id },
        update: {
          accountId: accountId || null,
          name: name || 'Custom Signature',
          contentHtml: contentHtml || '',
          contentText: contentText || '',
          isDefault: !!isDefault
        },
        create: {
          id: id || `sig_${Date.now()}`,
          tenantId,
          accountId: accountId || null,
          name: name || 'Custom Signature',
          contentHtml: contentHtml || '',
          contentText: contentText || '',
          isDefault: !!isDefault
        }
      });
    } else {
      sig = await globalPrisma.inboxSignature.create({
        data: {
          id: `sig_${Date.now()}`,
          tenantId,
          accountId: accountId || null,
          name: name || 'Custom Signature',
          contentHtml: contentHtml || '',
          contentText: contentText || '',
          isDefault: !!isDefault
        }
      });
    }

    res.json({ signature: sig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/signatures/:id', async (req: Request, res: Response) => {
  try {
    await globalPrisma.inboxSignature.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Collision Presence in-memory
const presenceStore: Map<string, { userId: string; userName: string; status: 'viewing' | 'typing'; updatedAt: number }[]> = new Map();

router.post('/threads/:id/presence', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, status } = req.body;

  const now = Date.now();
  let list = (presenceStore.get(id) || []).filter(p => now - p.updatedAt < 30000 && p.userId !== userId);
  
  if (status !== 'idle') {
    list.push({
      userId,
      userName: userName || 'Team Member',
      status: status || 'viewing',
      updatedAt: now
    });
  }

  presenceStore.set(id, list);
  res.json({
    activeCollaborators: list.map(p => ({
      id: p.userId,
      name: p.userName,
      status: p.status
    }))
  });
});

/**
 * =========================================================================
 * 1. ONE-CLICK OAUTH 2.0 FLOWS (Google & Microsoft 365)
 * =========================================================================
 */

router.get('/oauth/google/url', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const clientId = process.env.GOOGLE_CLIENT_ID || 'demo-aurora-client.apps.googleusercontent.com';
  const redirectUri = encodeURIComponent(`${process.env.APP_URL || 'http://localhost:5173'}/inbox/oauth/callback`);
  const scope = encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${tenantId}_google`;
  res.json({ url: authUrl });
});

router.post('/oauth/google/connect', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { email, name, avatarUrl, type, accessToken, refreshToken } = req.body;

    if (!email) return res.status(400).json({ error: 'Google email is required' });

    const newAcc = await globalPrisma.inboxAccount.create({
      data: {
        id: `acc_google_${Date.now()}`,
        tenantId,
        name: name || `${email.split('@')[0]} (Google)`,
        email,
        provider: 'GMAIL',
        isShared: type === 'SHARED',
        status: 'CONNECTED',
        config: {
          email,
          provider: 'gmail',
          color: '#EA4335',
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapSecure: true,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 465,
          smtpSecure: true,
          authType: 'OAUTH2',
          accessToken,
          refreshToken,
          avatarUrl
        }
      }
    });

    res.json({ success: true, account: newAcc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/oauth/microsoft/url', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const clientId = process.env.MICROSOFT_CLIENT_ID || 'demo-microsoft-app-id';
  const redirectUri = encodeURIComponent(`${process.env.APP_URL || 'http://localhost:5173'}/inbox/oauth/callback`);
  const scope = encodeURIComponent('offline_access Mail.ReadWrite Mail.Send User.Read');
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${tenantId}_ms`;
  res.json({ url: authUrl });
});

router.post('/oauth/microsoft/connect', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { email, name, type, accessToken, refreshToken } = req.body;

    if (!email) return res.status(400).json({ error: 'Microsoft email is required' });

    const newAcc = await globalPrisma.inboxAccount.create({
      data: {
        id: `acc_ms_${Date.now()}`,
        tenantId,
        name: name || `${email.split('@')[0]} (Outlook)`,
        email,
        provider: 'OUTLOOK',
        isShared: type === 'SHARED',
        status: 'CONNECTED',
        config: {
          email,
          provider: 'outlook',
          color: '#0078D4',
          imapHost: 'outlook.office365.com',
          imapPort: 993,
          imapSecure: true,
          smtpHost: 'smtp.office365.com',
          smtpPort: 587,
          smtpSecure: false,
          authType: 'OAUTH2',
          accessToken,
          refreshToken
        }
      }
    });

    res.json({ success: true, account: newAcc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * =========================================================================
 * 2. INBOUND EMAIL FORWARDING / WEBHOOK INGESTION (@inbox.aurora.internal)
 * =========================================================================
 */

router.post('/webhook/incoming', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    let tenantId = (req.headers['x-tenant-id'] as string);

    // Extract tenantId if forwarded to support-[tenantId]@inbox.aurora.internal
    const rawTo = typeof payload.to === 'string' ? payload.to : (Array.isArray(payload.to) ? payload.to[0]?.address || payload.to[0] : '');
    if (!tenantId && rawTo) {
      const match = rawTo.match(/support-([a-zA-Z0-9_-]+)@/);
      if (match && match[1]) {
        tenantId = match[1];
      }
    }
    if (!tenantId) {
      const firstTenant = await globalPrisma.tenant.findFirst();
      tenantId = firstTenant?.id || 'default-tenant';
    }

    const senderName = payload.fromName || (typeof payload.from === 'object' ? payload.from?.name : payload.from?.split('<')[0]?.trim()) || 'External Inbound Lead';
    const senderEmail = payload.fromEmail || (typeof payload.from === 'object' ? payload.from?.address : payload.from?.match(/<([^>]+)>/)?.[1] || payload.from) || 'sender@external.com';
    const subject = payload.subject || 'Inbound Forwarded Message';
    const bodyText = payload.text || payload.bodyText || payload.plainText || '';
    const bodyHtml = payload.html || payload.bodyHtml || `<p>${bodyText}</p>`;
    const snippet = (bodyText || subject).substring(0, 140);
    const now = new Date();

    // Fetch or create fallback shared account
    const acc = await globalPrisma.inboxAccount.findFirst({ where: { tenantId } });
    const accountId = acc?.id || `acc_shared_support_${tenantId}`;

    const newThread = await globalPrisma.inboxThread.create({
      data: {
        id: `th_inbound_${Date.now()}`,
        tenantId,
        accountId,
        subject,
        snippet,
        folder: 'inbox',
        isRead: false,
        isStarred: false,
        status: 'OPEN',
        assignedTo: 'AI Triage Agent',
        labels: ['Inbound Webhook', 'New Lead'],
        lastActivityAt: now,
        messages: {
          create: [
            {
              id: `msg_inbound_${Date.now()}`,
              senderName,
              senderEmail,
              toRecipients: [{ name: 'Aurora Workspace', address: rawTo || 'support@inbox.aurora.internal' }],
              subject,
              bodyText,
              bodyHtml,
              snippet,
              flags: ['\\Flagged'],
              sentAt: now,
              attachments: {
                create: (payload.attachments || []).map((a: any, i: number) => ({
                  id: `att_in_${Date.now()}_${i}`,
                  filename: a.filename || `attachment_${i + 1}`,
                  contentType: a.contentType || 'application/octet-stream',
                  size: a.size || 0,
                  contentBase64: a.contentBase64 || ''
                }))
              }
            }
          ]
        }
      },
      include: {
        messages: { include: { attachments: true } }
      }
    });

    res.json({
      success: true,
      message: 'Inbound email parsed and saved to Aurora Inbox',
      threadId: newThread.id
    });
  } catch (err: any) {
    console.error('[InboxWebhook] Ingestion error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * =========================================================================
 * 3. AUTOMATED BACKGROUND IMAP / API POLLER (Runs every 3 minutes)
 * =========================================================================
 */

async function runBackgroundInboxPoller() {
  try {
    const activeAccounts = await globalPrisma.inboxAccount.findMany({
      where: { status: 'CONNECTED' }
    });

    for (const acc of activeAccounts) {
      const cfg = acc.config as any;
      if (cfg && cfg.imapHost && cfg.password) {
        try {
          const client = new ImapClient(cfg);
          const messages = await client.fetchRecentMessages('INBOX', 10);
          if (messages && messages.length > 0) {
            for (const msg of messages) {
              const exists = await globalPrisma.inboxMessage.findFirst({
                where: { messageId: msg.messageId || msg.id }
              });

              if (!exists) {
                const now = new Date(msg.date || Date.now());
                await globalPrisma.inboxThread.create({
                  data: {
                    id: `th_${msg.id}_${Date.now()}`,
                    tenantId: acc.tenantId,
                    accountId: acc.id,
                    subject: msg.subject || 'No Subject',
                    snippet: msg.snippet || '',
                    folder: 'inbox',
                    isRead: false,
                    isStarred: false,
                    status: 'OPEN',
                    labels: ['Synced'],
                    lastActivityAt: now,
                    messages: {
                      create: [
                        {
                          id: msg.id,
                          messageId: msg.messageId || msg.id,
                          senderName: msg.from?.name || msg.from?.address || 'Unknown',
                          senderEmail: msg.from?.address || 'unknown@domain.com',
                          toRecipients: msg.to || [],
                          ccRecipients: msg.cc || [],
                          subject: msg.subject || 'No Subject',
                          bodyText: msg.bodyText || '',
                          bodyHtml: msg.bodyHtml || `<p>${msg.bodyText}</p>`,
                          snippet: msg.snippet || '',
                          sentAt: now
                        }
                      ]
                    }
                  }
                });
              }
            }
          }
        } catch (pollErr) {
          // Silent poll catch to keep server loop uninterrupted
        }
      }
    }
  } catch (globalErr) {
    // Keep background timer resilient
  }
}

// Start recurring 3-minute poller
setInterval(runBackgroundInboxPoller, 3 * 60 * 1000);

export default router;

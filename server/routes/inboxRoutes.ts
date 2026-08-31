import { Router, Request, Response } from 'express';
import { SmtpClient, ImapClient, autoDetectEmailSettings, EmailServerConfig, ParsedEmail, SendEmailPayload } from '../services/emailEngine';
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
  sharedMembers?: string[]; // user IDs with access
  createdAt: string;
}

export interface EmailThreadRecord {
  id: string;
  tenantId: string;
  accountId: string;
  subject: string;
  snippet: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  timestamp: string;
  folder: 'inbox' | 'starred' | 'sent' | 'drafts' | 'snoozed' | 'archive' | 'trash' | 'spam';
  isRead: boolean;
  isStarred: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  labels: string[];
  messages: ParsedEmail[];
  linkedRecords?: {
    id: string;
    moduleId: string;
    moduleName?: string;
    recordKey?: string;
    title: string;
    createdAt: string;
  }[];
  internalNotes?: {
    id: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
  }[];
  sharedStatus?: 'OPEN' | 'PENDING' | 'RESOLVED';
  assignedTo?: string; // Member name or ID
}

// In-Memory Storage cache for fast responsiveness
const accountsStore: Map<string, EmailAccountRecord[]> = new Map();
const threadsStore: Map<string, EmailThreadRecord[]> = new Map();
const rulesStore: Map<string, any[]> = new Map();

// Helper to get tenant accounts
function getTenantAccounts(tenantId: string): EmailAccountRecord[] {
  if (!accountsStore.has(tenantId)) {
    // Initial Seed Accounts (Personal + Shared)
    const initial: EmailAccountRecord[] = [
      {
        id: `acc_shared_support_${tenantId}`,
        tenantId,
        email: 'support@aurora.internal',
        name: 'Customer Support (Shared)',
        provider: 'shared',
        type: 'SHARED',
        color: '#3B82F6',
        config: { email: 'support@aurora.internal', provider: 'shared' },
        status: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
        unreadCount: 1,
        sharedMembers: ['all'],
        createdAt: new Date().toISOString()
      },
      {
        id: `acc_shared_sales_${tenantId}`,
        tenantId,
        email: 'sales@aurora.internal',
        name: 'Sales & Growth (Shared)',
        provider: 'shared',
        type: 'SHARED',
        color: '#10B981',
        config: { email: 'sales@aurora.internal', provider: 'shared' },
        status: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
        unreadCount: 1,
        sharedMembers: ['all'],
        createdAt: new Date().toISOString()
      }
    ];
    accountsStore.set(tenantId, initial);
  }
  return accountsStore.get(tenantId)!;
}

// Helper to get tenant threads
function getTenantThreads(tenantId: string): EmailThreadRecord[] {
  if (!threadsStore.has(tenantId)) {
    const accs = getTenantAccounts(tenantId);
    const supportAcc = accs[0]?.id || 'acc_shared_support';
    const salesAcc = accs[1]?.id || 'acc_shared_sales';

    const now = new Date();
    const initial: EmailThreadRecord[] = [
      {
        id: 'th_01_support_inquiry',
        tenantId,
        accountId: supportAcc,
        subject: 'URGENT: Enterprise SLA Request & Workflow Integration Question',
        snippet: 'Hi team, we are evaluating Aurora for 250 users and need assistance with the automated custom records pipeline.',
        from: { name: 'Elena Rostova', address: 'elena.rostova@apexlogistics.com' },
        to: [{ name: 'Aurora Support', address: 'support@aurora.internal' }],
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        folder: 'inbox',
        isRead: false,
        isStarred: true,
        labels: ['High Priority', 'Enterprise', 'Customer Care'],
        sharedStatus: 'OPEN',
        assignedTo: 'AI Triage Agent',
        messages: [
          {
            id: 'msg_01_1',
            from: { name: 'Elena Rostova', address: 'elena.rostova@apexlogistics.com' },
            to: [{ name: 'Aurora Support', address: 'support@aurora.internal' }],
            subject: 'URGENT: Enterprise SLA Request & Workflow Integration Question',
            date: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
            bodyText: 'Hello Aurora Support,\n\nWe are currently testing your platform for our logistics division (250 members). We noticed your People & Organisations taxonomy supports custom fields. Can you confirm if incoming emails can automatically create records in our custom "Logistics Claims" module?\n\nAlso, we would like to know if we can configure multi-step approval workflows for high-value claims above $10,000.\n\nBest regards,\nElena Rostova\nHead of Operations, Apex Logistics',
            bodyHtml: '<p>Hello Aurora Support,</p><p>We are currently testing your platform for our logistics division (250 members). We noticed your People & Organisations taxonomy supports custom fields. Can you confirm if incoming emails can automatically create records in our custom <strong>"Logistics Claims"</strong> module?</p><p>Also, we would like to know if we can configure multi-step approval workflows for high-value claims above $10,000.</p><br/><p>Best regards,<br/><strong>Elena Rostova</strong><br/>Head of Operations, Apex Logistics</p>',
            snippet: 'We are currently testing your platform for our logistics division (250 members)...',
            flags: ['\\Flagged'],
            attachments: [
              {
                id: 'att_01',
                filename: 'Apex_Workflow_Requirements_v2.pdf',
                contentType: 'application/pdf',
                size: 245000
              }
            ]
          }
        ],
        internalNotes: [
          {
            id: 'note_01',
            authorId: 'agent_triage',
            authorName: 'AI Triage Agent',
            authorEmail: 'agent@aurora.internal',
            content: 'Detected Enterprise Lead (250 seats) from Apex Logistics. Recommended converting this email to a Sales Opportunity or Support Ticket record.',
            createdAt: new Date(now.getTime() - 12 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'th_02_sales_quote',
        tenantId,
        accountId: salesAcc,
        subject: 'Partnership Quote & Custom Module Schema Review',
        snippet: 'Thanks for the demo call yesterday! Could you please send over the pricing catalog breakdown for standard vs developer seats?',
        from: { name: 'Marcus Sterling', address: 'm.sterling@sterlingcorp.global' },
        to: [{ name: 'Aurora Sales', address: 'sales@aurora.internal' }],
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        folder: 'inbox',
        isRead: true,
        isStarred: false,
        labels: ['Sales Deal', 'Pricing'],
        sharedStatus: 'OPEN',
        assignedTo: 'Sarah Jenkins',
        messages: [
          {
            id: 'msg_02_1',
            from: { name: 'Marcus Sterling', address: 'm.sterling@sterlingcorp.global' },
            to: [{ name: 'Aurora Sales', address: 'sales@aurora.internal' }],
            subject: 'Partnership Quote & Custom Module Schema Review',
            date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            bodyText: 'Hi Sarah,\n\nThanks for the demo call yesterday! Could you please send over the pricing catalog breakdown for standard vs developer seats? We are planning our Q4 deployment.\n\nWarm regards,\nMarcus Sterling',
            bodyHtml: '<p>Hi Sarah,</p><p>Thanks for the demo call yesterday! Could you please send over the pricing catalog breakdown for standard vs developer seats? We are planning our Q4 deployment.</p><br/><p>Warm regards,<br/><strong>Marcus Sterling</strong></p>',
            snippet: 'Thanks for the demo call yesterday! Could you please send over the pricing catalog breakdown...',
            flags: ['\\Seen'],
            attachments: []
          }
        ]
      }
    ];
    threadsStore.set(tenantId, initial);
  }
  return threadsStore.get(tenantId)!;
}

/**
 * GET /api/inbox/accounts
 * Fetch all email accounts (personal & shared)
 */
router.get('/accounts', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const accounts = getTenantAccounts(tenantId);
    
    // Sanitize passwords before sending to frontend
    const sanitized = accounts.map(acc => ({
      ...acc,
      config: {
        ...acc.config,
        password: acc.config.password ? '••••••••' : undefined
      }
    }));
    
    res.json({ accounts: sanitized });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/accounts/test
 * Test SMTP/IMAP connection credentials
 */
router.post('/accounts/test', async (req: Request, res: Response) => {
  try {
    const config: EmailServerConfig = req.body;
    if (!config.email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const auto = autoDetectEmailSettings(config.email);
    const mergedConfig: EmailServerConfig = { ...auto, ...config };

    if (mergedConfig.provider === 'shared') {
      return res.json({ success: true, message: 'Shared Inbox configuration is valid.' });
    }

    const smtpClient = new SmtpClient(mergedConfig);
    const smtpRes = await smtpClient.verifyConnection();

    if (!smtpRes.success) {
      return res.status(400).json({ 
        success: false, 
        step: 'SMTP',
        message: smtpRes.message 
      });
    }

    if (mergedConfig.imapHost) {
      const imapClient = new ImapClient(mergedConfig);
      const imapRes = await imapClient.verifyConnection();
      if (!imapRes.success) {
        return res.status(400).json({
          success: false,
          step: 'IMAP',
          message: imapRes.message
        });
      }
    }

    res.json({ 
      success: true, 
      message: `Connection to ${mergedConfig.provider?.toUpperCase() || 'Mail Server'} verified successfully!` 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/inbox/accounts
 * Add / Connect a new email account
 */
router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { email, name, password, provider, type, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, color } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const auto = autoDetectEmailSettings(email);
    const fullConfig: EmailServerConfig = {
      email,
      name: name || email.split('@')[0],
      password,
      provider: provider || auto.provider || 'custom',
      imapHost: imapHost || auto.imapHost,
      imapPort: imapPort || auto.imapPort,
      imapSecure: imapSecure !== undefined ? imapSecure : auto.imapSecure,
      smtpHost: smtpHost || auto.smtpHost,
      smtpPort: smtpPort || auto.smtpPort,
      smtpSecure: smtpSecure !== undefined ? smtpSecure : auto.smtpSecure,
    };

    const newAccount: EmailAccountRecord = {
      id: `acc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tenantId,
      email,
      name: name || email.split('@')[0],
      provider: fullConfig.provider || 'custom',
      type: type || 'PERSONAL',
      color: color || '#6366F1',
      config: fullConfig,
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      unreadCount: 0,
      sharedMembers: type === 'SHARED' ? ['all'] : undefined,
      createdAt: new Date().toISOString()
    };

    const accounts = getTenantAccounts(tenantId);
    accounts.push(newAccount);

    // If IMAP is available, trigger initial sync in background
    if (fullConfig.imapHost && fullConfig.password) {
      (async () => {
        try {
          const client = new ImapClient(fullConfig);
          const messages = await client.fetchRecentMessages('INBOX', 15);
          if (messages && messages.length > 0) {
            const threads = getTenantThreads(tenantId);
            for (const msg of messages) {
              threads.unshift({
                id: `th_${msg.id}`,
                tenantId,
                accountId: newAccount.id,
                subject: msg.subject || 'No Subject',
                snippet: msg.snippet || '',
                from: msg.from,
                to: msg.to,
                cc: msg.cc,
                timestamp: msg.date || new Date().toISOString(),
                folder: 'inbox',
                isRead: msg.flags?.includes('\\Seen') || false,
                isStarred: msg.flags?.includes('\\Flagged') || false,
                labels: ['Inbox'],
                messages: [msg]
              });
            }
          }
        } catch (e) {
          console.warn('[InboxSync] Initial sync background error:', e);
        }
      })();
    }

    res.json({ account: { ...newAccount, config: { ...newAccount.config, password: '••••••••' } } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/inbox/accounts/:id
 */
router.delete('/accounts/:id', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const accounts = getTenantAccounts(tenantId);
    const filtered = accounts.filter(a => a.id !== req.params.id);
    accountsStore.set(tenantId, filtered);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/accounts/:id/sync
 * Trigger sync for account
 */
router.post('/accounts/:id/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const accounts = getTenantAccounts(tenantId);
    const account = accounts.find(a => a.id === req.params.id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.config.imapHost && account.config.password) {
      const client = new ImapClient(account.config);
      const messages = await client.fetchRecentMessages('INBOX', 20);
      const threads = getTenantThreads(tenantId);
      
      let newCount = 0;
      for (const msg of messages) {
        const exists = threads.some(t => t.messages.some(m => m.messageId && m.messageId === msg.messageId));
        if (!exists) {
          newCount++;
          threads.unshift({
            id: `th_${msg.id}`,
            tenantId,
            accountId: account.id,
            subject: msg.subject || 'No Subject',
            snippet: msg.snippet || '',
            from: msg.from,
            to: msg.to,
            cc: msg.cc,
            timestamp: msg.date || new Date().toISOString(),
            folder: 'inbox',
            isRead: msg.flags?.includes('\\Seen') || false,
            isStarred: msg.flags?.includes('\\Flagged') || false,
            labels: ['Synced'],
            messages: [msg]
          });
        }
      }

      account.lastSyncedAt = new Date().toISOString();
      account.status = 'CONNECTED';
      res.json({ success: true, newMessagesCount: newCount });
    } else {
      account.lastSyncedAt = new Date().toISOString();
      res.json({ success: true, newMessagesCount: 0, message: 'Account synced' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inbox/threads
 */
router.get('/threads', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { accountId, folder, search, label, isStarred } = req.query;

    let threads = getTenantThreads(tenantId);

    if (accountId && accountId !== 'all') {
      threads = threads.filter(t => t.accountId === accountId);
    }

    if (folder) {
      if (folder === 'starred') {
        threads = threads.filter(t => t.isStarred && t.folder !== 'trash');
      } else {
        threads = threads.filter(t => t.folder === folder);
      }
    }

    if (isStarred === 'true') {
      threads = threads.filter(t => t.isStarred);
    }

    if (label) {
      threads = threads.filter(t => t.labels?.includes(label as string));
    }

    if (search) {
      const q = (search as string).toLowerCase();
      threads = threads.filter(t => 
        t.subject.toLowerCase().includes(q) ||
        t.from.name.toLowerCase().includes(q) ||
        t.from.address.toLowerCase().includes(q) ||
        t.snippet.toLowerCase().includes(q)
      );
    }

    // Sort by latest timestamp descending
    threads.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ threads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inbox/threads/:id
 */
router.get('/threads/:id', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ thread });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/send
 * Send real email
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, threadId, attachments } = req.body;

    if (!to || !to.length) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    const accounts = getTenantAccounts(tenantId);
    const account = accounts.find(a => a.id === accountId) || accounts[0];

    const payload: SendEmailPayload = {
      from: account?.email || 'noreply@aurora.internal',
      fromName: account?.name || 'Aurora Workspace User',
      to: Array.isArray(to) ? to : [to],
      cc: Array.isArray(cc) ? cc : (cc ? [cc] : []),
      bcc: Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []),
      subject: subject || 'No Subject',
      bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
      bodyText: bodyText || bodyHtml?.replace(/<[^>]+>/g, '') || '',
      attachments: attachments || []
    };

    let sendResult = { success: true, messageId: `<${Date.now()}@aurora.internal>` };

    // If account has real SMTP credentials, transmit via SMTP
    if (account && account.config && account.config.smtpHost && account.config.password) {
      const client = new SmtpClient(account.config);
      const resSmtp = await client.sendEmail(payload);
      sendResult = resSmtp;
    }

    // Record Sent Message in Threads
    const threads = getTenantThreads(tenantId);
    const sentMsg: ParsedEmail = {
      id: `msg_sent_${Date.now()}`,
      messageId: sendResult.messageId,
      from: { name: payload.fromName || payload.from, address: payload.from },
      to: payload.to.map(t => ({ name: t.split('@')[0], address: t })),
      cc: payload.cc?.map(c => ({ name: c.split('@')[0], address: c })),
      subject: payload.subject,
      date: new Date().toISOString(),
      bodyText: payload.bodyText || '',
      bodyHtml: payload.bodyHtml || '',
      snippet: (payload.bodyText || payload.subject).substring(0, 140),
      flags: ['\\Seen'],
      attachments: (payload.attachments || []).map((a, i) => ({
        id: `att_${Date.now()}_${i}`,
        filename: a.filename,
        contentType: a.contentType,
        size: Math.round((a.contentBase64?.length || 0) * 0.75),
        contentBase64: a.contentBase64
      }))
    };

    if (threadId) {
      const targetThread = threads.find(t => t.id === threadId);
      if (targetThread) {
        targetThread.messages.push(sentMsg);
        targetThread.timestamp = sentMsg.date;
        targetThread.snippet = sentMsg.snippet;
      }
    } else {
      threads.unshift({
        id: `th_sent_${Date.now()}`,
        tenantId,
        accountId: account?.id || 'acc_default',
        subject: payload.subject,
        snippet: sentMsg.snippet,
        from: sentMsg.from,
        to: sentMsg.to,
        cc: sentMsg.cc,
        timestamp: sentMsg.date,
        folder: 'sent',
        isRead: true,
        isStarred: false,
        labels: ['Sent'],
        messages: [sentMsg]
      });
    }

    res.json({ success: true, messageId: sendResult.messageId, message: sentMsg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/inbox/threads/:id/actions
 * Mark read/unread, star, snooze, archive, trash, label
 */
router.patch('/threads/:id/actions', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { action, value, label } = req.body;

    switch (action) {
      case 'markRead':
        thread.isRead = value !== undefined ? value : true;
        break;
      case 'star':
        thread.isStarred = value !== undefined ? value : true;
        break;
      case 'archive':
        thread.folder = 'archive';
        break;
      case 'trash':
        thread.folder = 'trash';
        break;
      case 'snooze':
        thread.folder = 'snoozed';
        thread.isSnoozed = true;
        thread.snoozedUntil = value || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'moveToInbox':
        thread.folder = 'inbox';
        thread.isSnoozed = false;
        break;
      case 'addLabel':
        if (label && !thread.labels.includes(label)) {
          thread.labels.push(label);
        }
        break;
      case 'removeLabel':
        if (label) {
          thread.labels = thread.labels.filter(l => l !== label);
        }
        break;
      case 'updateSharedStatus':
        thread.sharedStatus = value;
        break;
      case 'assign':
        thread.assignedTo = value;
        break;
    }

    res.json({ success: true, thread });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/notes
 * Add internal private collaboration note to thread
 */
router.post('/threads/:id/notes', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { authorId, authorName, authorEmail, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const newNote = {
      id: `note_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      authorId: authorId || 'user',
      authorName: authorName || 'Team Member',
      authorEmail: authorEmail || 'user@aurora.internal',
      content,
      createdAt: new Date().toISOString()
    };

    if (!thread.internalNotes) {
      thread.internalNotes = [];
    }
    thread.internalNotes.push(newNote);

    res.json({ success: true, note: newNote });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/convert
 * Convert email thread to an Aurora Module record and link them
 */
router.post('/threads/:id/convert', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { moduleId, moduleName, recordKey, title, recordId } = req.body;

    const linkedRecord = {
      id: recordId || `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      moduleId: moduleId || 'mod_tickets',
      moduleName: moduleName || 'Module Record',
      recordKey: recordKey || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title || thread.subject,
      createdAt: new Date().toISOString()
    };

    if (!thread.linkedRecords) {
      thread.linkedRecords = [];
    }
    thread.linkedRecords.push(linkedRecord);

    if (!thread.labels.includes('Converted to Record')) {
      thread.labels.push('Converted to Record');
    }

    res.json({ success: true, linkedRecord });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inbox/rules
 */
router.get('/rules', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const rules = rulesStore.get(tenantId) || [
    {
      id: 'rule_1',
      name: 'Auto-Assign Enterprise Inquiries',
      condition: { field: 'subject', operator: 'contains', value: 'Enterprise' },
      actions: { applyLabel: 'Enterprise', assignTo: 'Sarah Jenkins', triggerWorkflow: true },
      enabled: true
    }
  ];
  res.json({ rules });
});

/**
 * POST /api/inbox/threads/:id/assign
 */
router.post('/threads/:id/assign', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { id } = req.params;
    const { assignedTo, assignedToUser } = req.body;

    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    thread.assignedTo = assignedTo;
    (thread as any).assignedToUser = assignedToUser || { id: assignedTo, name: assignedTo };
    res.json({ success: true, thread });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/status
 */
router.post('/threads/:id/status', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { id } = req.params;
    const { sharedStatus } = req.body;

    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    thread.sharedStatus = sharedStatus;
    res.json({ success: true, thread });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/threads/:id/snooze
 */
router.post('/threads/:id/snooze', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const { id } = req.params;
    const { snoozedUntil } = req.body;

    const threads = getTenantThreads(tenantId);
    const thread = threads.find(t => t.id === id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    thread.folder = 'snoozed';
    thread.isSnoozed = true;
    thread.snoozedUntil = snoozedUntil;
    res.json({ success: true, thread });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Snippets Store
const snippetsStore: Map<string, any[]> = new Map();

/**
 * GET /api/inbox/snippets
 */
router.get('/snippets', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  if (!snippetsStore.has(tenantId)) {
    snippetsStore.set(tenantId, [
      {
        id: 'snip_intro',
        tenantId,
        title: 'Meeting Introduction',
        shortcut: '/intro',
        category: 'General',
        content: 'Hi there,\n\nThanks for reaching out to us. I would love to schedule a quick 15-minute call to discuss your requirements and how Aurora can help.\n\nBest regards,\n{{user.name}}',
        createdAt: new Date().toISOString()
      },
      {
        id: 'snip_pricing',
        tenantId,
        title: 'Enterprise Pricing Overview',
        shortcut: '/pricing',
        category: 'Sales',
        content: 'Hi,\n\nOur Enterprise tier includes dedicated workspace pods, custom AI agents, unlimited shared inboxes, and 24/7 SLA support. Let me know if you would like a customized proposal.\n\nCheers,\n{{user.name}}',
        createdAt: new Date().toISOString()
      },
      {
        id: 'snip_support',
        tenantId,
        title: 'Ticket Escalation Notice',
        shortcut: '/escalate',
        category: 'Support',
        content: 'Hello,\n\nI have escalated this ticket to our senior engineering squad for priority investigation. We will update you with our findings within 2 business hours.\n\nThank you for your patience,\nAurora Support Team',
        createdAt: new Date().toISOString()
      }
    ]);
  }
  res.json({ snippets: snippetsStore.get(tenantId) || [] });
});

/**
 * POST /api/inbox/snippets
 */
router.post('/snippets', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const newSnippet = {
    id: req.body.id || `snip_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    tenantId,
    title: req.body.title || 'Untitled Snippet',
    shortcut: req.body.shortcut?.startsWith('/') ? req.body.shortcut : `/${req.body.shortcut || 'snippet'}`,
    category: req.body.category || 'General',
    content: req.body.content || '',
    createdAt: new Date().toISOString()
  };

  const list = snippetsStore.get(tenantId) || [];
  const existingIdx = list.findIndex(s => s.id === newSnippet.id);
  if (existingIdx >= 0) {
    list[existingIdx] = newSnippet;
  } else {
    list.push(newSnippet);
  }
  snippetsStore.set(tenantId, list);
  res.json({ snippet: newSnippet });
});

/**
 * DELETE /api/inbox/snippets/:id
 */
router.delete('/snippets/:id', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const list = (snippetsStore.get(tenantId) || []).filter(s => s.id !== req.params.id);
  snippetsStore.set(tenantId, list);
  res.json({ success: true });
});

// Signatures Store
const signaturesStore: Map<string, any[]> = new Map();

/**
 * GET /api/inbox/signatures
 */
router.get('/signatures', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  if (!signaturesStore.has(tenantId)) {
    signaturesStore.set(tenantId, [
      {
        id: 'sig_default',
        tenantId,
        accountId: '',
        name: 'Standard Aurora Corporate Signature',
        contentHtml: `<div style="font-family: sans-serif; font-size: 13px; color: #374151; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 12px;">
  <strong>Aurora Operations</strong><br/>
  <span style="color: #6B7280;">Next-Gen Enterprise Cloud & AI Platform</span><br/>
  <a href="https://aurora.internal" style="color: #4F46E5; text-decoration: none;">aurora.internal</a>
</div>`,
        contentText: '\n--\nAurora Operations\nNext-Gen Enterprise Cloud & AI Platform\nhttps://aurora.internal',
        isDefault: true,
        createdAt: new Date().toISOString()
      }
    ]);
  }
  res.json({ signatures: signaturesStore.get(tenantId) || [] });
});

/**
 * POST /api/inbox/signatures
 */
router.post('/signatures', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const newSig = {
    id: req.body.id || `sig_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    tenantId,
    accountId: req.body.accountId || '',
    name: req.body.name || 'Custom Signature',
    contentHtml: req.body.contentHtml || '',
    contentText: req.body.contentText || '',
    isDefault: !!req.body.isDefault,
    createdAt: new Date().toISOString()
  };

  const list = signaturesStore.get(tenantId) || [];
  const existingIdx = list.findIndex(s => s.id === newSig.id);
  if (existingIdx >= 0) {
    list[existingIdx] = newSig;
  } else {
    list.push(newSig);
  }
  signaturesStore.set(tenantId, list);
  res.json({ signature: newSig });
});

// Scheduled Emails Store
const scheduledStore: Map<string, any[]> = new Map();

/**
 * GET /api/inbox/scheduled
 */
router.get('/scheduled', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  res.json({ scheduled: scheduledStore.get(tenantId) || [] });
});

/**
 * POST /api/inbox/scheduled
 */
router.post('/scheduled', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const { accountId, request, sendAt } = req.body;

  const item = {
    id: `sched_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    tenantId,
    accountId,
    request,
    sendAt: sendAt || new Date(Date.now() + 3600000).toISOString(),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  const list = scheduledStore.get(tenantId) || [];
  list.push(item);
  scheduledStore.set(tenantId, list);
  res.json({ scheduled: item });
});

/**
 * DELETE /api/inbox/scheduled/:id
 */
router.delete('/scheduled/:id', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const list = (scheduledStore.get(tenantId) || []).filter(s => s.id !== req.params.id);
  scheduledStore.set(tenantId, list);
  res.json({ success: true });
});

// Tracking Pixel Endpoint
const trackingPixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * GET /api/inbox/track/open/:messageId.png
 */
router.get('/track/open/:messageId.png', (req: Request, res: Response) => {
  const { messageId } = req.params;
  
  // Find matching message across threads
  for (const [_, threads] of threadsStore) {
    const thread = threads.find(t => t.messages.some(m => m.messageId === messageId || m.id === messageId));
    if (thread) {
      if (!(thread as any).tracking) {
        (thread as any).tracking = { openCount: 0, openedAt: new Date().toISOString() };
      }
      (thread as any).tracking.openCount += 1;
      (thread as any).tracking.openedAt = new Date().toISOString();
      break;
    }
  }

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': trackingPixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  });
  res.end(trackingPixel);
});

// Custom Folders Store
const customFoldersStore: Map<string, { id: string; tenantId?: string; name: string; color?: string; icon?: string; createdAt: string }[]> = new Map();

/**
 * GET /api/inbox/custom-folders
 */
router.get('/custom-folders', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const list = customFoldersStore.get(tenantId) || [
    { id: 'folder_clients', tenantId, name: 'VIP Clients', color: 'bg-emerald-500', icon: 'Folder', createdAt: new Date().toISOString() },
    { id: 'folder_invoices', tenantId, name: 'Invoices & Billing', color: 'bg-amber-500', icon: 'FileText', createdAt: new Date().toISOString() },
    { id: 'folder_legal', tenantId, name: 'Contracts & Legal', color: 'bg-indigo-500', icon: 'Shield', createdAt: new Date().toISOString() }
  ];
  if (!customFoldersStore.has(tenantId)) {
    customFoldersStore.set(tenantId, list);
  }
  res.json(list);
});

/**
 * POST /api/inbox/custom-folders
 */
router.post('/custom-folders', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const { name, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name is required' });

  const list = customFoldersStore.get(tenantId) || [];
  const newFolder = {
    id: `folder_${Date.now()}`,
    tenantId,
    name,
    color: color || 'bg-blue-500',
    icon: icon || 'Folder',
    createdAt: new Date().toISOString()
  };
  list.push(newFolder);
  customFoldersStore.set(tenantId, list);
  res.json(newFolder);
});

/**
 * DELETE /api/inbox/custom-folders/:id
 */
router.delete('/custom-folders/:id', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
  const { id } = req.params;
  let list = customFoldersStore.get(tenantId) || [];
  list = list.filter(f => f.id !== id);
  customFoldersStore.set(tenantId, list);
  res.json({ success: true });
});

// Real-time Collision Presence Store
const presenceStore: Map<string, { userId: string; userName: string; status: 'viewing' | 'typing'; updatedAt: number }[]> = new Map();

/**
 * POST /api/inbox/threads/:id/presence
 */
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

export default router;

import { DocumentTemplate, GeneratedDocument } from '../types/platform';

const STORAGE_KEY_TEMPLATES = 'aurora_document_templates_v2';
const STORAGE_KEY_DOCUMENTS = 'aurora_generated_documents_v1';
const SEED_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tmpl_nda_standard',
    tenantId: 'default',
    name: 'Standard Non-Disclosure Agreement',
    type: 'letter',
    description: 'Mutual non-disclosure and confidentiality agreement for contractors and partners.',
    status: 'Published',
    version: 1,
    metadata: {
      paperSize: 'A4',
      orientation: 'portrait',
      showLetterhead: true
    },
    content: `<h2>MUTUAL NON-DISCLOSURE AGREEMENT</h2>
<p>This Agreement is made effective as of <strong>{{createdAt}}</strong>, between <strong>{{tenant_name}}</strong> ("Disclosing Party") and <strong>{{recipient_name}}</strong> ("Receiving Party").</p>
<hr />
<h3>1. Purpose</h3>
<p>The parties wish to explore a business opportunity concerning {{project_title}} and will exchange confidential proprietary information.</p>
<h3>2. Confidential Information</h3>
<p>All information marked as Confidential or proprietary shall remain protected for a period of two (2) years.</p>
<br /><br />
<table style="width: 100%; border: none;">
  <tr>
    <td style="width: 50%;">
      <p>_____________________________</p>
      <p><strong>Authorized Signature (Disclosing)</strong></p>
    </td>
    <td style="width: 50%;">
      <p>_____________________________</p>
      <p><strong>Authorized Signature (Receiving)</strong></p>
    </td>
  </tr>
</table>`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'tmpl_welcome_email',
    tenantId: 'default',
    name: 'Client Onboarding Welcome Sequence',
    type: 'email',
    description: 'Automated transactional email sent when a new customer or account is activated.',
    status: 'Published',
    version: 1,
    metadata: {
      subject: 'Welcome aboard, {{name}}! Getting started with your account',
      preheader: 'Important details regarding your workspace setup and credentials',
      senderName: 'Aurora Customer Success',
      replyTo: 'support@aurora.io'
    },
    content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #18181b;">
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px; border-radius: 16px 16px 0 0; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Welcome to {{tenant_name}}!</h1>
    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">We are excited to have you on board.</p>
  </div>
  <div style="background: #ffffff; padding: 32px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 16px 16px;">
    <p>Hi <strong>{{first_name}}</strong>,</p>
    <p>Your workspace access for <strong>{{account_name}}</strong> is now active. You can now access your customized modules, view queues, and collaborate with your team.</p>
    <div style="margin: 28px 0; text-align: center;">
      <a href="{{portal_link}}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">Access Your Workspace &rarr;</a>
    </div>
    <p style="font-size: 13px; color: #71717a;">If you have any questions or require assistance, simply reply to this email.</p>
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
    <p style="font-size: 11px; color: #a1a1aa; text-align: center;">{{tenant_name}} • 100 Innovation Way • Automated Notification</p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'tmpl_service_announcement',
    tenantId: 'default',
    name: 'Citizen Portal Service Notice',
    type: 'page',
    description: 'Reusable portal layout snippet for scheduled maintenance notices and updates.',
    status: 'Published',
    version: 1,
    metadata: {
      slug: 'scheduled-maintenance-notice',
      containerWidth: 'contained',
      seoTitle: 'Service Schedule Notice'
    },
    content: `<div style="padding: 24px; border-radius: 16px; background: rgba(79, 70, 229, 0.05); border: 1px solid rgba(79, 70, 229, 0.15);">
  <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">📢 Important Service Announcement</h2>
  <p style="font-size: 14px; line-height: 1.6; color: #3f3f46;">
    Please be advised that automated document processing and portal intakes will undergo scheduled optimization this weekend.
  </p>
  <div style="background: white; padding: 16px; border-radius: 12px; margin-top: 16px; border: 1px solid #e4e4e7;">
    <p style="margin: 0; font-size: 13px; font-weight: 600;">Time Window: <strong>Saturday 11:00 PM — Sunday 02:00 AM UTC</strong></p>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #71717a;">All background workflows and queued actions will automatically resume immediately following completion.</p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    id: 'tmpl_appointment_reminder',
    tenantId: 'default',
    name: 'SMS Appointment Confirmation',
    type: 'message',
    description: 'Short transactional SMS notification dispatched 24 hours prior to scheduled booking.',
    status: 'Published',
    version: 1,
    metadata: {
      channel: 'sms',
      maxChars: 160
    },
    content: `Hi {{first_name}}, this is a reminder of your appointment on {{appointment_date}} at {{appointment_time}} with {{provider_name}}. Reply YES to confirm or call {{contact_phone}} to reschedule.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

const SEED_TEMPLATE_IDS = SEED_TEMPLATES.map(s => s.id);

function getStoredTemplates(): DocumentTemplate[] {
  if (typeof window === 'undefined') return SEED_TEMPLATES;
  try {
    let raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) {
      raw = localStorage.getItem('aurora_document_templates_v1');
    }
    const userTemplates: DocumentTemplate[] = raw ? JSON.parse(raw) : [];
    
    // Normalize types on existing records if missing
    const normalizedUserTemplates = userTemplates.map(t => ({
      ...t,
      type: t.type || 'letter'
    }));

    // Merge seeds and user templates
    const seedIds = new Set(SEED_TEMPLATE_IDS);
    const customOnly = normalizedUserTemplates.filter(t => !seedIds.has(t.id));
    return [...SEED_TEMPLATES, ...customOnly];
  } catch (e) {
    console.error('Error reading templates from localStorage:', e);
    return SEED_TEMPLATES;
  }
}

function saveStoredTemplates(templates: DocumentTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving templates to localStorage:', e);
  }
}

function getStoredDocuments(): GeneratedDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading documents from localStorage:', e);
    return [];
  }
}

function saveStoredDocuments(documents: GeneratedDocument[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(documents));
  } catch (e) {
    console.error('Error saving documents to localStorage:', e);
  }
}

export const DocumentService = {
  async getTemplates(tenantId?: string, moduleId?: string) {
    console.log(`[DocumentService] Fetching templates for tenant ${tenantId}, module ${moduleId}`);
    const all = getStoredTemplates();
    return all.filter(t => {
      const matchesTenant = !tenantId || !t.tenantId || t.tenantId === tenantId || t.tenantId === 'default';
      const matchesModule = !moduleId || !t.moduleId || t.moduleId === moduleId;
      return matchesTenant && matchesModule;
    });
  },

  async getTemplatesByType(tenantId?: string, type?: DocumentTemplate['type'], moduleId?: string) {
    const all = await this.getTemplates(tenantId, moduleId);
    if (!type) return all;
    return all.filter(t => (t.type || 'letter') === type);
  },

  async saveTemplate(tenantId: string, template: Partial<DocumentTemplate>) {
    console.log(`[DocumentService] Saving template for tenant ${tenantId}`, template);
    const all = getStoredTemplates();
    const existingIndex = template.id ? all.findIndex(t => t.id === template.id) : -1;

    let saved: DocumentTemplate;
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = all[existingIndex];
      saved = {
        ...existing,
        ...template,
        tenantId: tenantId || existing.tenantId || 'default',
        name: template.name !== undefined ? template.name : existing.name,
        type: template.type !== undefined ? template.type : (existing.type || 'letter'),
        description: template.description !== undefined ? template.description : existing.description,
        content: template.content !== undefined ? template.content : existing.content,
        metadata: template.metadata !== undefined ? template.metadata : existing.metadata,
        status: template.status !== undefined ? template.status : existing.status,
        moduleId: template.moduleId !== undefined ? template.moduleId : existing.moduleId,
        updatedAt: now,
        version: (existing.version || 1) + 1,
      } as DocumentTemplate;
      all[existingIndex] = saved;
    } else {
      saved = {
        id: template.id || `tmpl_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`,
        tenantId: tenantId || 'default',
        name: template.name || 'Untitled Content',
        type: template.type || 'letter',
        description: template.description || '',
        moduleId: template.moduleId,
        content: template.content || '',
        metadata: template.metadata || {},
        status: template.status || 'Draft',
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: template.createdBy || 'user'
      };
      all.push(saved);
    }

    saveStoredTemplates(all);
    return saved;
  },

  async deleteTemplate(tenantId: string, templateId: string) {
    console.log(`[DocumentService] Deleting template ${templateId} for tenant ${tenantId}`);
    const all = getStoredTemplates();
    const filtered = all.filter(t => t.id !== templateId);
    saveStoredTemplates(filtered);
    return true;
  },

  async generateDocument(tenantId: string, template: DocumentTemplate, recordData: Record<string, any>, userId: string) {
    let content = template.content;
    
    // Replace simple placeholders: {{field}}
    Object.keys(recordData).forEach(key => {
      const value = recordData[key];
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const displayValue = (value !== undefined && value !== null) 
        ? (typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value) : String(value))
        : '';
      content = content.replace(placeholder, displayValue);
    });

    // Handle conditional sections: [[IF field]] ... [[ENDIF]]
    const conditionalRegex = /\[\[IF\s+([\w.]+)]]([\s\S]*?)\[\[ENDIF]]/g;
    content = content.replace(conditionalRegex, (_, field, innerContent) => {
      return recordData[field] ? innerContent : '';
    });

    // Handle repeating sections: [[REPEAT list]] ... [[ENDREPEAT]]
    const repeatRegex = /\[\[REPEAT\s+([\w.]+)]]([\s\S]*?)\[\[ENDREPEAT]]/g;
    content = content.replace(repeatRegex, (_, listKey, innerContent) => {
      const list = recordData[listKey];
      if (Array.isArray(list)) {
        return list.map(item => {
          let itemContent = innerContent;
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => {
              const placeholder = new RegExp(`{{${key}}}`, 'g');
              itemContent = itemContent.replace(placeholder, String(item[key] ?? ''));
            });
          } else {
            itemContent = itemContent.replace(/{{item}}/g, String(item));
          }
          return itemContent;
        }).join('');
      }
      return '';
    });

    const docId = 'doc_' + Math.random().toString(36).substr(2, 9);
    const docData: GeneratedDocument = {
      id: docId,
      tenantId: tenantId || 'default',
      templateId: template.id,
      templateVersion: template.version,
      recordId: recordData.id as string | undefined,
      moduleId: template.moduleId,
      name: `${template.name}_${(recordData.id as string) || Date.now()}`,
      status: 'Draft',
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      dataSnapshot: recordData,
      content: content
    };

    const allDocs = getStoredDocuments();
    allDocs.push(docData);
    saveStoredDocuments(allDocs);

    return docData;
  },

  async getDocuments(tenantId: string, recordId?: string) {
    console.log(`[DocumentService] Fetching documents for tenant ${tenantId}, record ${recordId}`);
    const allDocs = getStoredDocuments();
    return allDocs.filter(d => {
      const matchesTenant = !tenantId || !d.tenantId || d.tenantId === tenantId || d.tenantId === 'default';
      const matchesRecord = !recordId || d.recordId === recordId;
      return matchesTenant && matchesRecord;
    });
  },

  async deleteDocument(tenantId: string, docId: string) {
    console.log(`[DocumentService] Deleting document ${docId} for tenant ${tenantId}`);
    const allDocs = getStoredDocuments();
    const filtered = allDocs.filter(d => d.id !== docId);
    saveStoredDocuments(filtered);
    return true;
  }
};

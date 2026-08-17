import { DocumentTemplate, GeneratedDocument } from '../types/platform';

const STORAGE_KEY_TEMPLATES = 'aurora_document_templates_v2';
const STORAGE_KEY_DOCUMENTS = 'aurora_generated_documents_v1';
const SEED_TEMPLATE_IDS = ['tmpl_nda_standard', 'tmpl_service_invoice', 'tmpl_project_proposal'];

function getStoredTemplates(): DocumentTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    // Check v2 key first, fallback to v1 key if user saved custom templates under v1
    let raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) {
      raw = localStorage.getItem('aurora_document_templates_v1');
    }
    if (!raw) {
      return [];
    }
    const parsed: DocumentTemplate[] = JSON.parse(raw);
    return parsed.filter(t => !SEED_TEMPLATE_IDS.includes(t.id));
  } catch (e) {
    console.error('Error reading templates from localStorage:', e);
    return [];
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
  async getTemplates(tenantId: string, moduleId?: string) {
    console.log(`[DocumentService] Fetching templates for tenant ${tenantId}, module ${moduleId}`);
    const all = getStoredTemplates();
    return all.filter(t => {
      const matchesTenant = !tenantId || !t.tenantId || t.tenantId === tenantId || t.tenantId === 'default';
      const matchesModule = !moduleId || !t.moduleId || t.moduleId === moduleId;
      return matchesTenant && matchesModule;
    });
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
        content: template.content !== undefined ? template.content : existing.content,
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
        name: template.name || 'Untitled Template',
        description: template.description || '',
        moduleId: template.moduleId,
        content: template.content || '',
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

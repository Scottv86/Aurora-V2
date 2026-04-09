import { DocumentTemplate, GeneratedDocument } from '../types/platform';

export const DocumentService = {
  async getTemplates(tenantId: string, moduleId?: string) {
    console.log(`[DocumentService] Fetching templates for tenant ${tenantId}, module ${moduleId}`);
    // NOTE: Firestore fetching removed. Transition to Prisma/API required.
    return [] as DocumentTemplate[];
  },

  async saveTemplate(tenantId: string, template: Partial<DocumentTemplate>) {
    console.log(`[DocumentService] Saving template for tenant ${tenantId}`, template);
    // NOTE: Firestore write removed. 
    return {
      ...template,
      id: template.id || 'temp-id',
      tenantId,
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
      version: (template.version || 0) + 1,
    } as unknown as DocumentTemplate;
  },

  async generateDocument(tenantId: string, template: DocumentTemplate, recordData: Record<string, any>, userId: string) {
    // Basic merge field replacement remains valid as it is pure JS
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
    const docData: Partial<GeneratedDocument> = {
      id: docId,
      tenantId,
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

    // NOTE: Firestore document generation storage removed.
    return docData as GeneratedDocument;
  },

  async getDocuments(tenantId: string, recordId?: string) {
    console.log(`[DocumentService] Fetching documents for tenant ${tenantId}, record ${recordId}`);
    // NOTE: Firestore fetching removed.
    return [] as GeneratedDocument[];
  }
};

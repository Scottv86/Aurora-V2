import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, collection, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { DocumentTemplate, GeneratedDocument } from '../types/platform';

export const DocumentService = {
  async getTemplates(tenantId: string, moduleId?: string) {
    const templatesRef = collection(db, 'tenants', tenantId, 'templates');
    let q = query(templatesRef, orderBy('createdAt', 'desc'));
    if (moduleId) {
      q = query(templatesRef, where('moduleId', '==', moduleId), orderBy('createdAt', 'desc'));
    }
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentTemplate));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `tenants/${tenantId}/templates`);
      throw error;
    }
  },

  async saveTemplate(tenantId: string, template: Partial<DocumentTemplate>) {
    const templatesRef = collection(db, 'tenants', tenantId, 'templates');
    const templateId = template.id || doc(templatesRef).id;
    const now = serverTimestamp();
    
    const templateData = {
      ...template,
      id: templateId,
      tenantId,
      updatedAt: now,
      createdAt: template.createdAt || now,
      version: (template.version || 0) + 1,
    };

    try {
      await setDoc(doc(db, 'tenants', tenantId, 'templates', templateId), templateData);
      return templateData as unknown as DocumentTemplate;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/templates/${templateId}`);
      throw error;
    }
  },

  async generateDocument(tenantId: string, template: DocumentTemplate, recordData: Record<string, any>, userId: string) {
    // Basic merge field replacement
    let content = template.content;
    
    // Replace simple placeholders: {{field}}
    Object.keys(recordData).forEach(key => {
      const value = recordData[key];
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      // Only replace if value is not an object (unless it's a Date)
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
            // If it's a simple array of values, use {{item}} as placeholder
            itemContent = itemContent.replace(/{{item}}/g, String(item));
          }
          return itemContent;
        }).join('');
      }
      return '';
    });

    const docId = doc(collection(db, 'tenants', tenantId, 'documents')).id;
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

    try {
      await setDoc(doc(db, 'tenants', tenantId, 'documents', docId), {
        ...docData,
        generatedAt: serverTimestamp()
      });
      return docData as GeneratedDocument;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/documents/${docId}`);
      throw error;
    }
  },

  async getDocuments(tenantId: string, recordId?: string) {
    const docsRef = collection(db, 'tenants', tenantId, 'documents');
    let q = query(docsRef, orderBy('generatedAt', 'desc'));
    if (recordId) {
      q = query(docsRef, where('recordId', '==', recordId), orderBy('generatedAt', 'desc'));
    }
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `tenants/${tenantId}/documents`);
      throw error;
    }
  }
};

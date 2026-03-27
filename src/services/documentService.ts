import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
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
      return templateData as DocumentTemplate;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/templates/${templateId}`);
      throw error;
    }
  },

  async generateDocument(tenantId: string, template: DocumentTemplate, recordData: any, userId: string) {
    // Basic merge field replacement
    let content = template.content;
    
    // Replace simple placeholders: {{field}}
    Object.keys(recordData).forEach(key => {
      const value = recordData[key];
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(placeholder, value !== undefined && value !== null ? String(value) : '');
    });

    // Handle conditional sections: [[IF field]] ... [[ENDIF]]
    // This is a very simple implementation
    const conditionalRegex = /\[\[IF\s+(\w+)\]\]([\s\S]*?)\[\[ENDIF\]\]/g;
    content = content.replace(conditionalRegex, (match, field, innerContent) => {
      return recordData[field] ? innerContent : '';
    });

    // Handle repeating sections: [[REPEAT list]] ... [[ENDREPEAT]]
    const repeatRegex = /\[\[REPEAT\s+(\w+)\]\]([\s\S]*?)\[\[ENDREPEAT\]\]/g;
    content = content.replace(repeatRegex, (match, listKey, innerContent) => {
      const list = recordData[listKey];
      if (Array.isArray(list)) {
        return list.map(item => {
          let itemContent = innerContent;
          Object.keys(item).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(placeholder, String(item[key]));
          });
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
      recordId: recordData.id,
      moduleId: template.moduleId,
      name: `${template.name}_${recordData.id || Date.now()}`,
      status: 'Draft',
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      dataSnapshot: recordData,
      content: content // Storing the merged HTML content
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

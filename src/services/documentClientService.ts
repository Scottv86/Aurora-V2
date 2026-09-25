import { API_BASE_URL } from '../config';
import { 
  UniversalDocument, 
  UniversalDisposalSchedule, 
  AiExtractionResult,
  FileTechnicalMetadata
} from '../types/document';

function getAuthHeaders(): Record<string, string> {
  const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant_default';
  const authDataStr = localStorage.getItem('aurora_auth');
  let token = (import.meta as any).env?.VITE_DEV_TOKEN || '';
  if (authDataStr) {
    try {
      const authData = JSON.parse(authDataStr);
      token = authData?.access_token || authData?.token || token;
    } catch (e) {}
  }

  return {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export class DocumentClientService {
  /**
   * Upload Document with optional AI extraction
   */
  static async uploadDocument(params: {
    file: File;
    moduleId?: string;
    recordId?: string;
    fieldId?: string;
    folderId?: string;
    sourceType?: string;
    classification?: string;
    documentType?: string;
    retentionScheduleId?: string;
    analyzeWithAi?: boolean;
    targetFields?: Array<{ id: string; label: string; type: string }>;
  }): Promise<{ document: UniversalDocument; aiExtraction: AiExtractionResult | null }> {
    const { file, ...rest } = params;

    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data url prefix
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        contentBase64: base64,
        ...rest
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload document');
    }

    return res.json();
  }

  /**
   * Run AI analysis directly on a file without saving
   */
  static async analyzeFileDirect(
    file: File,
    targetFields: Array<{ id: string; label: string; type: string }> = []
  ): Promise<any> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`${API_BASE_URL}/api/documents/process-ai-direct`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        contentBase64: base64,
        targetFields
      })
    });

    if (!res.ok) throw new Error('AI analysis failed');
    return res.json();
  }

  /**
   * Get all documents linked to a record
   */
  static async getRecordDocuments(recordId: string): Promise<UniversalDocument[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/record/${recordId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch record documents');
    const data = await res.json();
    return data.documents || [];
  }

  /**
   * Search documents across platform (eDiscovery)
   */
  static async searchDocuments(query: string = '', filters: any = {}): Promise<UniversalDocument[]> {
    const params = new URLSearchParams({ query, ...filters });
    const res = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.documents || [];
  }

  /**
   * Get single document
   */
  static async getDocumentById(id: string): Promise<UniversalDocument> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Document not found');
    const data = await res.json();
    return data.document;
  }

  /**
   * Upload new version
   */
  static async uploadVersion(documentId: string, file: File, note?: string): Promise<UniversalDocument> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/version`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        contentBase64: base64,
        note
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to upload version');
    }
    const data = await res.json();
    return data.document;
  }

  /**
   * Toggle Legal Hold
   */
  static async toggleLegalHold(documentId: string, reason?: string): Promise<UniversalDocument> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/legal-hold`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to toggle legal hold');
    }
    const data = await res.json();
    return data.document;
  }

  /**
   * Update classification & retention
   */
  static async updateClassification(
    documentId: string,
    classification: string,
    retentionScheduleId?: string
  ): Promise<UniversalDocument> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/classification`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ classification, retentionScheduleId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to update classification');
    }
    const data = await res.json();
    return data.document;
  }

  /**
   * Delete Document
   */
  static async deleteDocument(documentId: string, permanent: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}?permanent=${permanent}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to delete document');
    }
    return res.json();
  }

  /**
   * Ask Document Copilot
   */
  static async queryCopilot(documentId: string, query: string, history: any[] = []): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/query-copilot`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, history })
    });
    if (!res.ok) throw new Error('Copilot query failed');
    const data = await res.json();
    return data.answer;
  }

  /**
   * Get Governance Queues
   */
  static async getGovernanceQueue(): Promise<{
    activeLegalHolds: UniversalDocument[];
    expiringWithin30Days: UniversalDocument[];
    pendingDisposal: UniversalDocument[];
  }> {
    const res = await fetch(`${API_BASE_URL}/api/documents/governance/queue`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch governance queue');
    return res.json();
  }

  /**
   * Get Disposal Schedules
   */
  static async getDisposalSchedules(): Promise<UniversalDisposalSchedule[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/schedules`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch disposal schedules');
    const data = await res.json();
    return data.schedules || [];
  }

  /**
   * Save Disposal Schedule
   */
  static async saveDisposalSchedule(schedule: Partial<UniversalDisposalSchedule>): Promise<UniversalDisposalSchedule> {
    const res = await fetch(`${API_BASE_URL}/api/documents/schedules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(schedule)
    });
    if (!res.ok) throw new Error('Failed to save disposal schedule');
    const data = await res.json();
    return data.schedule;
  }

  /**
   * Compare Document Versions (Text & Clause Diff)
   */
  static async compareVersions(documentId: string, versionA?: number, versionB?: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/compare-versions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ versionA, versionB })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Comparison failed' }));
      throw new Error(err.error || 'Comparison failed');
    }
    const data = await res.json();
    return data.diff;
  }

  /**
   * Preview Convert Document to Record
   */
  static async previewConvertToRecord(
    documentId: string,
    targetType: 'PEOPLE_ORG' | 'MODULE',
    targetSchema?: any
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/convert-to-record`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetType, targetSchema, executeCreate: false })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to extract record data');
    }
    const data = await res.json();
    return data.draft;
  }

  /**
   * Execute Convert Document to Record
   */
  static async executeConvertToRecord(
    documentId: string,
    targetType: 'PEOPLE_ORG' | 'MODULE',
    payload: any
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/convert-to-record`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetType, executeCreate: true, payload })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Creation failed' }));
      throw new Error(err.error || 'Failed to create record from document');
    }
    return res.json();
  }

  /**
   * Extract Line Items
   */
  static async extractLineItems(documentId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/extract-line-items`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to extract line items');
    const data = await res.json();
    return data.items || [];
  }

  /**
   * Extract Obligations & Milestones
   */
  static async extractObligations(documentId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/extract-obligations`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to extract obligations');
    const data = await res.json();
    return data.obligations || [];
  }

  /**
   * Add In-Viewer Pin Annotation
   */
  static async addAnnotation(
    documentId: string,
    annotation: {
      xPercent: number;
      yPercent: number;
      pageNumber?: number;
      comment: string;
      authorName?: string;
      authorAvatar?: string;
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/annotations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(annotation)
    });
    if (!res.ok) throw new Error('Failed to add annotation');
    const data = await res.json();
    return data.annotation;
  }

  /**
   * Resolve or Reopen Annotation
   */
  static async resolveAnnotation(documentId: string, annotationId: string, isResolved: boolean = true): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/annotations/${annotationId}/resolve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isResolved })
    });
    if (!res.ok) throw new Error('Failed to resolve annotation');
    return res.json();
  }

  /**
   * Sign Document & Apply Signature Stamp
   */
  static async signDocument(
    documentId: string,
    signatureData: {
      signatureType: 'DRAW' | 'TYPE' | 'STAMP';
      signerName: string;
      signerEmail: string;
      signatureDataUrl?: string;
      note?: string;
    }
  ): Promise<UniversalDocument> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/sign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(signatureData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Sign failed' }));
      throw new Error(err.error || 'Failed to sign document');
    }
    const data = await res.json();
    return data.document;
  }

  /**
   * AI PII Redaction
   */
  static async redactDocument(documentId: string, redactedEntities: string[]): Promise<UniversalDocument> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/redact`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ redactedEntities })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Redaction failed' }));
      throw new Error(err.error || 'Failed to redact document');
    }
    const data = await res.json();
    return data.document;
  }

  /**
   * Bulk Actions on Multiple Documents
   */
  static async bulkActions(
    documentIds: string[],
    action: 'LEGAL_HOLD_ON' | 'LEGAL_HOLD_OFF' | 'ASSIGN_RDS' | 'TRASH',
    payload?: any
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/documents/batch/actions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentIds, action, payload })
    });
    if (!res.ok) throw new Error('Bulk action failed');
    return res.json();
  }

  /**
   * Merge Multiple Documents into a Binder
   */
  static async mergeDocuments(
    documentIds: string[],
    binderName: string,
    targetContext?: { moduleId?: string; recordId?: string }
  ): Promise<UniversalDocument> {
    const res = await fetch(`${API_BASE_URL}/api/documents/batch/merge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentIds, binderName, targetContext })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Merge failed' }));
      throw new Error(err.error || 'Failed to merge documents');
    }
    const data = await res.json();
    return data.document;
  }

  /**
   * Get Technical File Metadata (EXIF, GPS, dimensions, PDF info)
   */
  static async getDocumentMetadata(documentId: string): Promise<FileTechnicalMetadata | null> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/metadata`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.metadata || null;
  }
}


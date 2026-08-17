import { API_BASE_URL } from '../config';

export interface SoftDeleteOptions {
  tenantId: string;
  token?: string;
  itemType: 'MODULE' | 'FORM' | 'WORKFLOW' | 'VALIDATION' | 'AUTOMATION' | 'CONNECTOR' | 'SOLUTION' | 'SITE' | 'PAGE' | 'GLOBAL_LIST' | 'REPORT' | 'DOCUMENT_TEMPLATE' | string;
  itemId: string;
  title: string;
  subtitle?: string;
  payload: any;
  deletedBy?: string;
}

export const TrashService = {
  async softDelete(options: SoftDeleteOptions): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/trash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': options.tenantId,
          ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {})
        },
        body: JSON.stringify({
          itemType: options.itemType,
          itemId: options.itemId,
          title: options.title,
          subtitle: options.subtitle || null,
          payload: options.payload || {},
          deletedBy: options.deletedBy || 'User'
        })
      });
      return res.ok;
    } catch (err) {
      console.error('[TrashService] Soft delete error:', err);
      return false;
    }
  }
};

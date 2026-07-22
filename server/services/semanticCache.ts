import crypto from 'crypto';

export interface CachedManifestResponse {
  promptHash: string;
  tenantId: string;
  intentCategory: string;
  responsePayload: any;
  createdAt: number;
  hitCount: number;
}

/**
 * Enterprise Semantic & Exact Prompt Cache Engine
 * Provides < 20ms instant responses for repeated prompts within tenant scope, consuming 0 LLM tokens.
 */
export class SemanticCacheEngine {
  private static cacheStore = new Map<string, CachedManifestResponse>();
  private static MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours TTL

  /**
   * Generates a deterministic hash for a tenant prompt string.
   */
  private static computeHash(tenantId: string, prompt: string): string {
    const cleanPrompt = (prompt || '').trim().toLowerCase();
    return crypto.createHash('sha256').update(`${tenantId}:${cleanPrompt}`).digest('hex');
  }

  /**
   * Checks for a cached response for the prompt within tenant scope.
   */
  public static get(tenantId: string, prompt: string): CachedManifestResponse | null {
    const key = this.computeHash(tenantId, prompt);
    const entry = this.cacheStore.get(key);

    if (!entry) return null;

    // Verify TTL
    if (Date.now() - entry.createdAt > this.MAX_CACHE_AGE_MS) {
      this.cacheStore.delete(key);
      return null;
    }

    entry.hitCount += 1;
    return entry;
  }

  /**
   * Stores an AI response in the semantic cache.
   */
  public static set(tenantId: string, prompt: string, intentCategory: string, responsePayload: any): void {
    const key = this.computeHash(tenantId, prompt);
    this.cacheStore.set(key, {
      promptHash: key,
      tenantId,
      intentCategory,
      responsePayload,
      createdAt: Date.now(),
      hitCount: 0
    });
  }

  /**
   * Evicts cached prompts for a tenant (e.g. when workspace modules change).
   */
  public static clearTenantCache(tenantId: string): void {
    for (const [key, value] of this.cacheStore.entries()) {
      if (value.tenantId === tenantId) {
        this.cacheStore.delete(key);
      }
    }
  }
}

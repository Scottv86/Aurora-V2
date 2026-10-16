import DOMPurify from 'dompurify';

/**
 * Sanitizes untrusted HTML strings to prevent Cross-Site Scripting (XSS)
 * before rendering with dangerouslySetInnerHTML.
 * Works seamlessly in both browser (DOMPurify) and non-browser/test environments.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  // Browser environment: use native DOMPurify engine
  if (typeof window !== 'undefined') {
    const purifier = (DOMPurify as any).default || DOMPurify;
    if (typeof purifier?.sanitize === 'function') {
      return purifier.sanitize(dirtyHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel'],
      });
    }
  }

  // Server-side / Node test environment fallback: deep strip dangerous tags and attributes
  return dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\bon[a-z]+\s*=\s*['"][^'"]*['"]/gi, '')
    .replace(/\bon[a-z]+\s*=\s*[^ >]+/gi, '')
    .replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'href="#"')
    .replace(/src\s*=\s*['"]javascript:[^'"]*['"]/gi, 'src=""');
}

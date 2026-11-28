import dns from 'dns/promises';
import net from 'net';

export interface SafeWebFetchResult {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  contentType: string;
  wordCount: number;
  byteLength: number;
  contentSummary: string;
  rawText: string;
  pdfBuffer?: Buffer;
  filename?: string;
}

const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 1_000_000; // 1 MB cap for HTML/text
const MAX_PDF_BYTES = 8_000_000; // 8 MB cap for PDF documents
const MAX_TEXT_CHARS = 20_000;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data',
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
  '.corp',
  '.lan',
];

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b, c] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT / Tailscale)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast & reserved (224.0.0.0/4, 240.0.0.0/4)

  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();
  if (normalized === '::' || normalized === '::1') return true;

  // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const tail = normalized.slice('::ffff:'.length);
    if (net.isIPv4(tail)) {
      return isBlockedIpv4(tail);
    }
    const hexParts = tail.split(':');
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        return isBlockedIpv4(ipv4);
      }
    }
    return true;
  }

  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-local (fe80::/10)
  if (/^fe[89ab]/.test(normalized)) return true;
  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) return true;

  return false;
}

export function isBlockedIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').split('%')[0];
  const version = net.isIP(clean);
  if (version === 4) return isBlockedIpv4(clean);
  if (version === 6) return isBlockedIpv6(clean);
  return true; // Fail closed on unparseable IP
}

async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format. Please enter a full http:// or https:// web address.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// web URLs are allowed.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname) {
    throw new Error('URL must include a valid hostname.');
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error('Access to local or internal network addresses is blocked for security.');
  }

  // If hostname is already an IP literal, validate immediately
  const strippedHost = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(strippedHost)) {
    if (isBlockedIp(strippedHost)) {
      throw new Error('Access to private, loopback, or cloud metadata IP addresses is blocked.');
    }
    return parsed;
  }

  // Resolve all DNS records and ensure none point to private/internal IPs
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(`Could not resolve domain "${hostname}". Please check the URL.`);
  }

  if (!records || records.length === 0) {
    throw new Error(`Domain "${hostname}" did not resolve to any IP address.`);
  }

  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new Error('Target URL resolves to a private or internal network address and was blocked.');
    }
  }

  return parsed;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    });
}

function extractHtmlContent(html: string): { title: string; description: string; text: string } {
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch ? decodeHtmlEntities(descMatch[1]).replace(/\s+/g, ' ').trim() : '';

  // Remove non-content tags & comments
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|canvas|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|main|aside|li|tr|h[1-6]|blockquote|pre|dt|dd)>/gi, '\n')
    .replace(/<(td|th)\b[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ');

  cleaned = decodeHtmlEntities(cleaned)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, description, text: cleaned };
}

async function readBodyWithLimit(res: Response, maxBytes: number): Promise<Buffer> {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (total + value.byteLength > maxBytes) {
        const remaining = maxBytes - total;
        if (remaining > 0) {
          chunks.push(value.subarray(0, remaining));
          total += remaining;
        }
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export async function safeFetchWebPage(rawUrl: string): Promise<SafeWebFetchResult> {
  let currentUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = `https://${currentUrl}`;
  }

  let currentParsed = await assertSafeUrl(currentUrl);
  let response: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      response = await fetch(currentParsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'AuroraSolutionStudio/1.0 (+https://aurora.platform; read-only reference fetcher)',
          Accept: 'text/html,application/xhtml+xml,application/pdf,text/plain,text/markdown,application/json;q=0.9,*/*;q=0.1',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out after 10 seconds while fetching the webpage.');
      }
      throw new Error(`Unable to reach ${currentParsed.hostname}: ${err?.message || 'network error'}`);
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Webpage returned an invalid redirect without a target URL.');
      }
      if (hop === MAX_REDIRECTS) {
        throw new Error('Too many redirects while fetching this URL.');
      }
      const nextUrl = new URL(location, currentParsed).toString();
      currentParsed = await assertSafeUrl(nextUrl);
      continue;
    }

    break;
  }

  if (!response) {
    throw new Error('No response received from the target URL.');
  }

  if (!response.ok) {
    throw new Error(`Target webpage returned HTTP ${response.status} (${response.statusText || 'error'}).`);
  }

  const contentType = (response.headers.get('content-type') || 'text/plain').toLowerCase();
  const isPdf = contentType.includes('application/pdf');
  const isAllowedType =
    isPdf ||
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml+xml') ||
    contentType.includes('text/plain') ||
    contentType.includes('text/markdown') ||
    contentType.includes('application/json') ||
    contentType.includes('application/xml') ||
    contentType.includes('text/xml');

  if (!isAllowedType) {
    throw new Error(
      `Unsupported content type (${contentType.split(';')[0]}). For images or Office files, use Local File Upload instead.`
    );
  }

  const buffer = await readBodyWithLimit(response, isPdf ? MAX_PDF_BYTES : MAX_BODY_BYTES);
  const fallbackTitle = currentParsed.hostname.replace(/^www\./, '');

  if (isPdf) {
    const rawSeg = decodeURIComponent(currentParsed.pathname.split('/').filter(Boolean).pop() || 'document.pdf');
    const filename = rawSeg.toLowerCase().endsWith('.pdf') ? rawSeg : `${rawSeg}.pdf`;
    const cleanTitle = filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim() || fallbackTitle;
    return {
      url: rawUrl,
      finalUrl: currentParsed.toString(),
      title: cleanTitle,
      description: '',
      contentType: 'application/pdf',
      wordCount: 0,
      byteLength: buffer.byteLength,
      contentSummary: `PDF document from ${currentParsed.hostname} (${Math.round(buffer.byteLength / 1024)} KB)`,
      rawText: '',
      pdfBuffer: buffer,
      filename,
    };
  }

  const rawBody = buffer.toString('utf-8');

  let title = fallbackTitle;
  let description = '';
  let extractedText = '';

  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
    const parsedHtml = extractHtmlContent(rawBody);
    title = parsedHtml.title || fallbackTitle;
    description = parsedHtml.description;
    extractedText = parsedHtml.text;
  } else if (contentType.includes('application/json')) {
    try {
      extractedText = JSON.stringify(JSON.parse(rawBody), null, 2);
    } catch {
      extractedText = rawBody;
    }
  } else {
    extractedText = rawBody.trim();
  }

  if (!extractedText || extractedText.length < 20) {
    throw new Error(
      'No readable text could be extracted from this page (it may require login or heavy client-side rendering).'
    );
  }

  const truncatedText = extractedText.slice(0, MAX_TEXT_CHARS);
  const wordCount = truncatedText.split(/\s+/).filter(Boolean).length;
  const contentSummary = description
    ? `${description.slice(0, 220)} (${wordCount.toLocaleString()} words from ${currentParsed.hostname})`
    : `Extracted ${wordCount.toLocaleString()} words from ${currentParsed.hostname}${currentParsed.pathname === '/' ? '' : currentParsed.pathname}`;

  const rawText = [
    `Source URL: ${currentParsed.toString()}`,
    `Page Title: ${title}`,
    description ? `Summary: ${description}` : '',
    '',
    truncatedText,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    url: rawUrl,
    finalUrl: currentParsed.toString(),
    title,
    description,
    contentType: contentType.split(';')[0],
    wordCount,
    byteLength: buffer.byteLength,
    contentSummary,
    rawText,
  };
}

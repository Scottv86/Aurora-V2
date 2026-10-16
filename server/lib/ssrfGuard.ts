import dns from 'dns';
import { URL } from 'url';

/**
 * Validates whether an IP address is in a private, loopback, or cloud-metadata range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 Checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IP
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Broadcast/Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local / AWS / GCP / Azure Instance Metadata Service 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // IPv6 Checks
  const normalized = ip.toLowerCase();
  if (
    normalized === '::1' || 
    normalized === '::' ||
    normalized.startsWith('fc') || 
    normalized.startsWith('fd') || 
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    normalized.startsWith('::ffff:169.254.')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities before an outbound request is made.
 * Rejects non-HTTP(S) protocols and hostnames that resolve to private or loopback networks.
 */
export async function validateSafeUrl(targetUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new Error(`Invalid URL: ${targetUrl}`);
  }

  // Strictly enforce http or https
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Forbidden protocol: ${parsedUrl.protocol}. Only http and https are allowed.`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost and common local domain names directly
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error(`Access to private host '${hostname}' is restricted.`);
  }

  // If already an IP address
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Access to private or reserved IP '${hostname}' is restricted.`);
    }
    return parsedUrl;
  }

  // Resolve DNS to verify the destination IP
  try {
    const lookupResult = await dns.promises.lookup(hostname, { all: true });
    for (const record of lookupResult) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(`Host '${hostname}' resolved to private/restricted IP '${record.address}'.`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('restricted')) {
      throw err;
    }
    throw new Error(`DNS resolution failed for host '${hostname}': ${err.message}`);
  }

  return parsedUrl;
}

/**
 * SSRF-safe wrapper around fetch
 */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  await validateSafeUrl(url);
  return fetch(url, init);
}

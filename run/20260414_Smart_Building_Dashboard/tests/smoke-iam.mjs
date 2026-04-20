// Smoke test for INTEGRA demo server: verifies all 7 logins + IAM + tenant/guest endpoints
const BASE = 'http://localhost:5000/api/v1';

const ACCOUNTS = [
  { label: 'Sys Admin',         email: 'admin@integra.com',    password: 'admin123',    role: 'sys_admin' },
  { label: 'CFO Executive',     email: 'cfo@integra.com',      password: 'cfo123',      role: 'financial_decision_maker' },
  { label: 'Technician',        email: 'tech@integra.com',     password: 'tech123',     role: 'technician' },
  { label: 'Building Manager',  email: 'manager@integra.com',  password: 'manager123',  role: 'building_manager' },
  { label: 'Security Officer',  email: 'security@integra.com', password: 'security123', role: 'security_officer' },
  { label: 'Tenant',            email: 'tenant@integra.com',   password: 'tenant123',   role: 'tenant' },
  { label: 'Hotel Guest',       email: 'guest@integra.com',    password: 'guest123',    role: 'guest' },
];

const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const okMark   = '✓';
const failMark = '✗';

const check = (cond, name) => {
  if (cond) { pass++; log(`  ${okMark} ${name}`); }
  else      { fail++; log(`  ${failMark} ${name}`); }
};

async function call(path, opts = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  let body; try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function loginAll() {
  log('\n── 1. AUTH MATRIX ──────────────────────────────');
  const tokens = {};
  for (const a of ACCOUNTS) {
    const r = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: a.email, password: a.password }) });
    const ok = r.status === 200 && r.body?.data?.user?.role === a.role;
    check(ok, `${a.label.padEnd(18)} → ${a.email} (${a.role})`);
    if (ok) tokens[a.role] = r.body.data.accessToken;
  }
  return tokens;
}

async function testIam(tokens) {
  log('\n── 2. IAM ENDPOINTS ────────────────────────────');
  const r1 = await call('/iam/access-events', {}, tokens.sys_admin);
  check(r1.status === 200 && Array.isArray(r1.body?.data), `GET /iam/access-events (sys_admin) returned array`);

  const r2 = await call('/iam/credentials', {}, tokens.security_officer);
  check(r2.status === 200 && Array.isArray(r2.body?.data), `GET /iam/credentials (security)`);

  const r3 = await call('/iam/unlock', { method: 'POST', body: JSON.stringify({ doorId: 'door-office-3a', method: 'mobile_key' }) }, tokens.tenant);
  check(r3.status === 200 && r3.body?.data?.result, `POST /iam/unlock (tenant)`);

  const r4 = await call('/iam/biometric/enroll', { method: 'POST', body: JSON.stringify({ factor: 'fingerprint' }) }, tokens.guest);
  check(r4.status === 200, `POST /iam/biometric/enroll (guest)`);

  const r5 = await call('/iam/mfa/enable', { method: 'POST', body: JSON.stringify({ method: 'totp' }) }, tokens.sys_admin);
  check(r5.status === 200, `POST /iam/mfa/enable (sys_admin)`);
}

async function testTenantGuest(tokens) {
  log('\n── 3. TENANT / GUEST PORTALS ───────────────────');
  const r1 = await call('/tenant/me/summary', {}, tokens.tenant);
  check(r1.status === 200 && r1.body?.data?.company, `GET /tenant/me/summary → ${r1.body?.data?.company}`);

  const r2 = await call('/guest/me/stay', {}, tokens.guest);
  check(r2.status === 200 && r2.body?.data?.roomNumber, `GET /guest/me/stay → room ${r2.body?.data?.roomNumber}`);
}

async function testDashboards(tokens) {
  log('\n── 4. ROLE-SCOPED DASHBOARDS ───────────────────');
  // Manager should access executive dashboard now
  const r1 = await call('/dashboard/executive', {}, tokens.building_manager);
  check(r1.status === 200, `GET /dashboard/executive (building_manager) ⇒ ${r1.status}`);

  // Tenant should NOT access executive dashboard
  const r2 = await call('/dashboard/executive', {}, tokens.tenant);
  check(r2.status === 403, `GET /dashboard/executive (tenant) blocked ⇒ ${r2.status}`);

  // Technician dashboard
  const r3 = await call('/dashboard/technician', {}, tokens.technician);
  check(r3.status === 200, `GET /dashboard/technician (technician) ⇒ ${r3.status}`);
}

async function testInvalid() {
  log('\n── 5. NEGATIVE TESTS ───────────────────────────');
  const r1 = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'nobody@x.com', password: 'x' }) });
  check(r1.status === 401, `Bad credentials → 401`);

  const r2 = await call('/iam/access-events');
  check(r2.status === 401, `Unauthenticated /iam/access-events → 401`);
}

(async () => {
  log('═══════════════════════════════════════════════════');
  log('  INTEGRA — Smoke Test Suite');
  log('═══════════════════════════════════════════════════');
  try {
    const tokens = await loginAll();
    await testIam(tokens);
    await testTenantGuest(tokens);
    await testDashboards(tokens);
    await testInvalid();
  } catch (e) {
    log(`Fatal: ${e.message}`);
    fail++;
  }
  log('\n═══════════════════════════════════════════════════');
  log(`  RESULTS: ${pass} passed · ${fail} failed`);
  log('═══════════════════════════════════════════════════');
  process.exit(fail === 0 ? 0 : 1);
})();

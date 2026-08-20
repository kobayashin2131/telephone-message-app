import { deserializeVapidKeys, sendPushNotification } from 'web-push-browser';

const parseOrgId = (raw) => {
  const v = parseInt(raw, 10);
  return Number.isInteger(v) && v > 0 ? v : 1;
};

// --- FCM (native Android/iOS push) helpers ---
// Web PushはCapacitorのWebView内では信頼できないため、ネイティブアプリはこちらを使う。

const base64UrlEncode = (bytes) => {
  let str = typeof bytes === 'string' ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedFcmAccessToken = null; // { token, expiresAt } — Worker isolate内で使い回す

async function getFcmAccessToken(env) {
  if (cachedFcmAccessToken && cachedFcmAccessToken.expiresAt > Date.now() + 60000) {
    return cachedFcmAccessToken.token;
  }

  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const enc = new TextEncoder();
  const unsigned = `${base64UrlEncode(enc.encode(JSON.stringify(header)))}.${base64UrlEncode(enc.encode(JSON.stringify(claims)))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`
  });
  if (!tokenRes.ok) throw new Error(`FCM token exchange failed: ${await tokenRes.text()}`);
  const tokenData = await tokenRes.json();

  cachedFcmAccessToken = { token: tokenData.access_token, expiresAt: Date.now() + (tokenData.expires_in * 1000) };
  return tokenData.access_token;
}

async function getMessageRecipientUserIds(db, targetType, targetId, excludeUserId) {
  if (targetType === 'dm' || targetType === 'user') {
    return [Number(targetId)].filter(id => id !== Number(excludeUserId));
  }
  if (targetType === 'group') {
    const { results } = await db.prepare('SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?')
      .bind(targetId, excludeUserId).all();
    return results.map(r => r.user_id);
  }
  if (targetType === 'department') {
    const { results } = await db.prepare('SELECT id FROM users WHERE department_id = ? AND id != ?')
      .bind(targetId, excludeUserId).all();
    return results.map(r => r.id);
  }
  return [];
}

async function sendFcmToUsers(env, userIds, { title, body, data }) {
  if (!env.FCM_SERVICE_ACCOUNT_JSON || !userIds || userIds.length === 0) return;

  const placeholders = userIds.map(() => '?').join(',');
  const { results: tokens } = await env.DB.prepare(
    `SELECT id, user_id, token FROM fcm_tokens WHERE user_id IN (${placeholders})`
  ).bind(...userIds).all();
  if (!tokens || tokens.length === 0) return;

  let accessToken;
  try {
    accessToken = await getFcmAccessToken(env);
  } catch (e) {
    console.error('FCM access token error', e.message);
    return;
  }
  const projectId = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON).project_id;

  await Promise.all(tokens.map(async (t) => {
    try {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
            android: { priority: 'high', notification: { sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } }
          }
        })
      });
      if (res.status === 404 || res.status === 400) {
        // 無効・失効したトークンは片付ける
        const resBody = await res.text();
        if (resBody.includes('UNREGISTERED') || resBody.includes('INVALID_ARGUMENT')) {
          await env.DB.prepare('DELETE FROM fcm_tokens WHERE id = ?').bind(t.id).run();
        }
      }
    } catch (e) {
      console.error('FCM send failed', t.id, e.message);
    }
  }));
}

// --- Auth helpers (PBKDF2 PIN hashing, session tokens) ---

const bufToHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
const hexToBuf = (hex) => new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));

async function hashPin(pin) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  return `${bufToHex(salt)}:${bufToHex(bits)}`;
}

async function verifyPin(pin, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBuf(saltHex), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  return bufToHex(bits) === hashHex;
}

const generateToken = () => bufToHex(crypto.getRandomValues(new Uint8Array(32)));

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STAFF_ROLES = ['owner', 'admin']; // roles allowed to manage users/departments

// Per-org subdomain login: {slug}.SUBDOMAIN_BASE. Free-tier Cloudflare SSL only
// covers a first-level wildcard, so this stays a single label off the base
// domain (not a second-level wildcard) — see CLAUDE.md for the cost tradeoff.
const SUBDOMAIN_BASE = 'easystance.app';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;
// easystance.app already hosts other, unrelated apps on their own subdomains
// (e.g. worklog.easystance.app) — block orgs from picking labels that could
// collide with those or with likely-future infra labels.
const RESERVED_SLUGS = new Set(['www', 'api', 'app', 'admin', 'mail', 'ftp', 'worklog', 'platform-admin', 'callsync', 'connect-suite', 'homebase', 'staging', 'dev', 'test']);

// Maps an old slug host to a new one after a future domain move, so existing
// bookmarks keep working via redirect instead of breaking. Empty until needed.
const LEGACY_HOST_REDIRECTS = {};

function resolveSlugFromHost(request) {
  const host = (request.headers.get('Host') || '').toLowerCase();
  if (!host.endsWith(`.${SUBDOMAIN_BASE}`)) return null;
  const label = host.slice(0, -(`.${SUBDOMAIN_BASE}`.length));
  if (!label || label.includes('.') || !SLUG_PATTERN.test(label)) return null;
  return label;
}

async function resolveOrgFromHost(db, request) {
  const slug = resolveSlugFromHost(request);
  if (!slug) return null;
  return db.prepare('SELECT id, name, slug FROM organizations WHERE slug = ?').bind(slug).first();
}

async function resolveSession(db, request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const row = await db.prepare(`
    SELECT s.token, s.expires_at, u.id as user_id, u.name, u.email, u.role, u.organization_id, o.status as org_status
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE s.token = ?
  `).bind(token).first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  if (row.org_status === 'cancelled') return null;
  return row;
}

async function resolvePlatformSession(db, request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const row = await db.prepare(`
    SELECT s.token, s.expires_at, a.id as admin_id, a.email
    FROM platform_sessions s
    JOIN platform_admins a ON s.platform_admin_id = a.id
    WHERE s.token = ?
  `).bind(token).first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare('DELETE FROM platform_sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return row;
}

async function sendWebPushToUsers(env, userIds, { title, body, data }) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !userIds || userIds.length === 0) return;

  const placeholders = userIds.map(() => '?').join(',');
  const { results: subs } = await env.DB.prepare(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (${placeholders})`
  ).bind(...userIds).all();
  if (!subs || subs.length === 0) return;

  const vapidKeys = await deserializeVapidKeys({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  });

  const payload = JSON.stringify({
    title,
    body,
    type: data?.type || 'message',
    data: data || {},
    url: data?.url || '/'
  });

  await Promise.all(subs.map(async (sub) => {
    try {
      const res = await sendPushNotification(
        vapidKeys,
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        'support@easystance.app',
        payload
      );
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    } catch (e) {
      console.error('web push send failed', sub.id, e.message);
    }
  }));
}

async function sendPushToSubscribers(env, excludeUserId, memo, orgId) {
  const { results: subs } = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id != ? AND organization_id = ?')
    .bind(excludeUserId || -1, orgId).all();
  if (!subs || subs.length === 0) return;

  const vapidKeys = await deserializeVapidKeys({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  });

  const payload = JSON.stringify({
    type: 'call_memo',
    title: `📞 ${memo.company_name} より受電`,
    body: memo.contact_person ? `${memo.contact_person} 様` : (memo.subject || '内容を確認してください'),
    memoId: memo.id,
    url: `/?app=callsync&memo_id=${memo.id}`
  });

  await Promise.all(subs.map(async (sub) => {
    try {
      const res = await sendPushNotification(
        vapidKeys,
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        'support@easystance.app',
        payload
      );
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    } catch (e) {
      console.error('push send failed', sub.id, e.message);
    }
  }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const incomingHost = url.hostname.toLowerCase();
    if (LEGACY_HOST_REDIRECTS[incomingHost]) {
      const target = new URL(url.toString());
      target.hostname = LEGACY_HOST_REDIRECTS[incomingHost];
      return Response.redirect(target.toString(), 301);
    }

    const path = url.pathname;

    if (!path.startsWith('/api/') && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    const db = env.DB;
    const orgIdFromQuery = () => parseOrgId(url.searchParams.get('organization_id'));

    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    try {
      // 1. Users
      if (path === '/api/users' && request.method === 'GET') {
        const orgId = orgIdFromQuery();
        const { results } = await db.prepare(`
          SELECT u.id, u.name, u.email, u.avatar_color, u.role, u.department_id, d.name as department_name, u.created_at
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.organization_id = ?
          ORDER BY u.id ASC
        `).bind(orgId).all();
        return jsonResponse(results);
      }

      if (path === '/api/users' && request.method === 'POST') {
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const session = await resolveSession(db, request);
        if (!session || session.organization_id !== orgId || !STAFF_ROLES.includes(session.role)) {
          return jsonResponse({ error: '管理者権限が必要です' }, 403);
        }
        const role = body.role || 'user';
        if (role === 'owner') {
          return jsonResponse({ error: 'オーナー権限の付与はこの画面では行えません' }, 403);
        }
        const pin = body.pin || '0000';
        if (!/^\d{4,8}$/.test(pin)) return jsonResponse({ error: 'PINは4〜8桁の数字で入力してください' }, 400);
        const passwordHash = await hashPin(pin);
        const info = await db.prepare(`
          INSERT INTO users (name, email, password_hash, department_id, role, avatar_color, organization_id, must_change_pin)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(body.name, body.email, passwordHash, body.department_id || null, role, body.avatar_color || '#3b82f6', orgId).run();
        return jsonResponse({ id: info.meta.last_row_id, ...body });
      }

      if (path.startsWith('/api/users/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const session = await resolveSession(db, request);
        if (!session || session.organization_id !== orgId || !STAFF_ROLES.includes(session.role)) {
          return jsonResponse({ error: '管理者権限が必要です' }, 403);
        }
        const role = body.role || 'user';
        const target = await db.prepare('SELECT role FROM users WHERE id = ? AND organization_id = ?').bind(id, orgId).first();
        if (role === 'owner' && target?.role !== 'owner') {
          return jsonResponse({ error: 'オーナー権限の付与はこの画面では行えません' }, 403);
        }
        if (role !== 'owner' && target?.role === 'owner') {
          const { results: owners } = await db.prepare('SELECT id FROM users WHERE organization_id = ? AND role = ?').bind(orgId, 'owner').all();
          if (owners.length <= 1) return jsonResponse({ error: '組織に最低1人はオーナーが必要です' }, 400);
        }
        await db.prepare(`
          UPDATE users SET name = ?, email = ?, department_id = ?, role = ?, avatar_color = ? WHERE id = ? AND organization_id = ?
        `).bind(body.name, body.email, body.department_id || null, role, body.avatar_color || '#3b82f6', id, orgId).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/users/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        const orgId = orgIdFromQuery();
        const session = await resolveSession(db, request);
        if (!session || session.organization_id !== orgId || !STAFF_ROLES.includes(session.role)) {
          return jsonResponse({ error: '管理者権限が必要です' }, 403);
        }
        const target = await db.prepare('SELECT role FROM users WHERE id = ? AND organization_id = ?').bind(id, orgId).first();
        if (target?.role === 'owner') return jsonResponse({ error: 'オーナーのアカウントは削除できません' }, 400);
        await db.prepare('DELETE FROM users WHERE id = ? AND organization_id = ?').bind(id, orgId).run();
        return jsonResponse({ success: true });
      }

      // 1b. Organization info (plan/storage — read-only for org staff; changes are platform-admin-only for now)
      if (path === '/api/organization' && request.method === 'GET') {
        const session = await resolveSession(db, request);
        if (!session || !STAFF_ROLES.includes(session.role)) return jsonResponse({ error: '管理者権限が必要です' }, 403);

        const org = await db.prepare(`
          SELECT
            o.id, o.name, o.plan_tier, o.storage_limit_bytes, o.slug, o.created_at,
            (SELECT COALESCE(SUM(m.attachment_size), 0) FROM messages m JOIN chat_groups g ON m.target_id = g.id AND m.target_type = 'group' WHERE g.organization_id = o.id) as storage_used_bytes,
            (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count
          FROM organizations o WHERE o.id = ?
        `).bind(session.organization_id).first();
        if (!org) return jsonResponse({ error: '組織が見つかりません' }, 404);
        return jsonResponse({ ...org, login_url: org.slug ? `https://${org.slug}.${SUBDOMAIN_BASE}` : null });
      }

      // 1c. Org subdomain slug: availability check + owner-only assignment
      if (path === '/api/auth/check-slug' && request.method === 'GET') {
        const slug = (url.searchParams.get('slug') || '').toLowerCase();
        if (!SLUG_PATTERN.test(slug)) {
          return jsonResponse({ available: false, reason: '半角英数字とハイフンで3〜32文字（先頭は英数字）にしてください' });
        }
        if (RESERVED_SLUGS.has(slug)) {
          return jsonResponse({ available: false, reason: 'このURLは予約済みのため使用できません' });
        }
        const existing = await db.prepare('SELECT id FROM organizations WHERE slug = ?').bind(slug).first();
        return jsonResponse({ available: !existing });
      }

      if (path === '/api/organization/slug' && request.method === 'POST') {
        const session = await resolveSession(db, request);
        if (!session || session.role !== 'owner') return jsonResponse({ error: 'オーナー権限が必要です' }, 403);

        const body = await request.json();
        const slug = (body.slug || '').toLowerCase();
        if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) {
          return jsonResponse({ error: '半角英数字とハイフンで3〜32文字（先頭は英数字）にしてください' }, 400);
        }
        const existing = await db.prepare('SELECT id FROM organizations WHERE slug = ?').bind(slug).first();
        if (existing && existing.id !== session.organization_id) {
          return jsonResponse({ error: 'このURLは既に使われています' }, 409);
        }
        await db.prepare('UPDATE organizations SET slug = ? WHERE id = ?').bind(slug, session.organization_id).run();
        return jsonResponse({ success: true, login_url: `https://${slug}.${SUBDOMAIN_BASE}` });
      }

      // 2. Departments
      if (path === '/api/departments' && request.method === 'GET') {
        const orgId = orgIdFromQuery();
        const { results } = await db.prepare(`
          SELECT d.id, d.name, d.created_at, COUNT(u.id) as user_count
          FROM departments d
          LEFT JOIN users u ON d.id = u.department_id
          WHERE d.organization_id = ?
          GROUP BY d.id
          ORDER BY d.id ASC
        `).bind(orgId).all();
        return jsonResponse(results);
      }

      if (path === '/api/departments' && request.method === 'POST') {
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const session = await resolveSession(db, request);
        if (!session || session.organization_id !== orgId || !STAFF_ROLES.includes(session.role)) {
          return jsonResponse({ error: '管理者権限が必要です' }, 403);
        }
        const info = await db.prepare('INSERT INTO departments (name, organization_id) VALUES (?, ?)').bind(body.name, orgId).run();
        return jsonResponse({ id: info.meta.last_row_id, name: body.name, user_count: 0 });
      }

      if (path.startsWith('/api/departments/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const session = await resolveSession(db, request);
        if (!session || session.organization_id !== orgId || !STAFF_ROLES.includes(session.role)) {
          return jsonResponse({ error: '管理者権限が必要です' }, 403);
        }
        await db.prepare('UPDATE departments SET name = ? WHERE id = ? AND organization_id = ?').bind(body.name, id, orgId).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/departments/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        const orgId = orgIdFromQuery();
        const session = await resolveSession(db, request);
        if (!session || session.organization_id !== orgId || !STAFF_ROLES.includes(session.role)) {
          return jsonResponse({ error: '管理者権限が必要です' }, 403);
        }
        await db.prepare('DELETE FROM departments WHERE id = ? AND organization_id = ?').bind(id, orgId).run();
        return jsonResponse({ success: true });
      }

      // 3. Groups
      if (path === '/api/groups' && request.method === 'GET') {
        const orgId = orgIdFromQuery();
        const { results } = await db.prepare(`
          SELECT g.*,
                 (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
                 (SELECT GROUP_CONCAT(user_id) FROM group_members WHERE group_id = g.id) as member_ids_str
          FROM chat_groups g
          WHERE g.organization_id = ?
          ORDER BY g.created_at DESC
        `).bind(orgId).all();
        const mapped = results.map(r => ({
          ...r,
          member_ids: r.member_ids_str ? r.member_ids_str.split(',').map(Number) : []
        }));
        return jsonResponse(mapped);
      }

      if (path === '/api/groups' && request.method === 'POST') {
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const info = await db.prepare(
          'INSERT INTO chat_groups (name, description, icon, created_by, organization_id) VALUES (?, ?, ?, ?, ?)'
        ).bind(body.name, body.description || '', body.icon || '👥', body.created_by || 1, orgId).run();
        const groupId = info.meta.last_row_id;

        const allMembers = Array.from(new Set([body.created_by || 1, ...(body.member_ids || [])]));
        for (const uid of allMembers) {
          await db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').bind(groupId, uid).run();
        }

        await db.prepare(
          'INSERT INTO messages (target_type, target_id, sender_id, message_type, content) VALUES (?, ?, ?, ?, ?)'
        ).bind('group', groupId, body.created_by || 1, 'system', `グループ「${body.name}」が作成されました！`).run();

        return jsonResponse({ id: groupId, ...body, member_count: allMembers.length, member_ids: allMembers });
      }

      if (path.startsWith('/api/groups/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        await db.prepare('UPDATE chat_groups SET name = ?, description = ?, icon = ? WHERE id = ? AND organization_id = ?')
          .bind(body.name, body.description || '', body.icon || '👥', id, orgId).run();
        if (body.member_ids) {
          await db.prepare('DELETE FROM group_members WHERE group_id = ?').bind(id).run();
          for (const uid of body.member_ids) {
            await db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').bind(id, uid).run();
          }
        }
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/groups/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        const orgId = orgIdFromQuery();
        await db.prepare('DELETE FROM group_members WHERE group_id = ?').bind(id).run();
        await db.prepare('DELETE FROM messages WHERE target_type = "group" AND target_id = ?').bind(id).run();
        await db.prepare('DELETE FROM chat_groups WHERE id = ? AND organization_id = ?').bind(id, orgId).run();
        return jsonResponse({ success: true });
      }

      // 4. Caller Contacts
      if (path === '/api/contacts' && request.method === 'GET') {
        const orgId = orgIdFromQuery();
        const q = url.searchParams.get('q');
        let stmt;
        if (q) {
          stmt = db.prepare('SELECT * FROM caller_contacts WHERE organization_id = ? AND (company_name LIKE ? OR contact_person LIKE ? OR phone_number LIKE ?) ORDER BY call_count DESC')
            .bind(orgId, `%${q}%`, `%${q}%`, `%${q}%`);
        } else {
          stmt = db.prepare('SELECT * FROM caller_contacts WHERE organization_id = ? ORDER BY call_count DESC, last_called_at DESC').bind(orgId);
        }
        const { results } = await stmt.all();
        return jsonResponse(results);
      }

      if (path === '/api/contacts' && request.method === 'POST') {
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const info = await db.prepare(
          'INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes, organization_id) VALUES (?, ?, ?, ?, ?)'
        ).bind(body.company_name, body.contact_person || '', body.phone_number, body.frequent_notes || '', orgId).run();
        return jsonResponse({ id: info.meta.last_row_id, ...body, call_count: 0 });
      }

      if (path.startsWith('/api/contacts/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        await db.prepare(
          'UPDATE caller_contacts SET company_name = ?, contact_person = ?, phone_number = ?, frequent_notes = ? WHERE id = ? AND organization_id = ?'
        ).bind(body.company_name, body.contact_person, body.phone_number, body.frequent_notes, id, orgId).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/contacts/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        const orgId = orgIdFromQuery();
        await db.prepare('DELETE FROM caller_contacts WHERE id = ? AND organization_id = ?').bind(id, orgId).run();
        return jsonResponse({ success: true });
      }

      // 5. Call Memos
      if (path === '/api/call-memos' && request.method === 'GET') {
        const orgId = orgIdFromQuery();
        const { results } = await db.prepare(`
          SELECT cm.*,
                 cu.name as creator_name, cu.avatar_color as creator_avatar,
                 ru.name as resolver_name,
                 m.target_type, m.target_id,
                 CASE 
                   WHEN m.target_type = 'dm' THEN (SELECT name FROM users WHERE id = m.target_id)
                   WHEN m.target_type = 'group' THEN (SELECT name FROM chat_groups WHERE id = m.target_id)
                   WHEN m.target_type = 'department' THEN (SELECT name FROM departments WHERE id = m.target_id)
                   ELSE NULL
                 END as target_name
          FROM call_memos cm
          LEFT JOIN users cu ON cm.created_by = cu.id
          LEFT JOIN users ru ON cm.resolved_by = ru.id
          LEFT JOIN messages m ON m.call_memo_id = cm.id AND m.message_type = 'call_card'
          WHERE cm.organization_id = ?
          ORDER BY cm.created_at DESC
        `).bind(orgId).all();
        return jsonResponse(results);
      }

      if (path === '/api/call-memos' && request.method === 'POST') {
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const now = new Date().toISOString();
        let contactId = body.caller_contact_id;

        if (contactId) {
          await db.prepare('UPDATE caller_contacts SET call_count = call_count + 1, last_called_at = ? WHERE id = ? AND organization_id = ?')
            .bind(now, contactId, orgId).run();
        } else if (body.save_contact) {
          const cInfo = await db.prepare(
            'INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes, call_count, last_called_at, organization_id) VALUES (?, ?, ?, ?, 1, ?, ?)'
          ).bind(body.company_name, body.contact_person || '', body.phone_number || '', body.frequent_notes || '', now, orgId).run();
          contactId = cInfo.meta.last_row_id;
        }

        const memoInfo = await db.prepare(`
          INSERT INTO call_memos (caller_contact_id, company_name, contact_person, phone_number, subject, body, call_type, status, created_by, organization_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).bind(contactId || null, body.company_name, body.contact_person || '', body.phone_number || '', body.subject || '受電連絡', body.body || '', body.call_type || 'callback', body.created_by || 1, orgId).run();

        const memoId = memoInfo.meta.last_row_id;

        if (body.target_type && body.target_id) {
          const summary = `📞 【受電】${body.company_name} ${body.contact_person || ''}様より連絡`;
          const msgInfo = await db.prepare(`
            INSERT INTO messages (target_type, target_id, sender_id, message_type, content, call_memo_id)
            VALUES (?, ?, ?, 'call_card', ?, ?)
          `).bind(body.target_type, body.target_id, body.created_by || 1, summary, memoId).run();
          const messageId = msgInfo.meta.last_row_id;

          await db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)')
            .bind(messageId, body.created_by || 1).run();
        }

        ctx.waitUntil(sendPushToSubscribers(env, body.created_by || 1, {
          id: memoId,
          company_name: body.company_name,
          contact_person: body.contact_person,
          subject: body.subject
        }, orgId));

        ctx.waitUntil((async () => {
          const { results: orgUsers } = await db.prepare('SELECT id FROM users WHERE organization_id = ? AND id != ?')
            .bind(orgId, body.created_by || 1).all();
          await sendFcmToUsers(env, orgUsers.map(u => u.id), {
            title: `📞 ${body.company_name} より受電`,
            body: body.contact_person ? `${body.contact_person} 様` : (body.subject || '内容を確認してください'),
            data: { type: 'call_memo', memoId }
          });
        })());

        return jsonResponse({ id: memoId, company_name: body.company_name, status: 'pending' });
      }

      // 5b. Push Notification Subscriptions
      if (path === '/api/push/vapid-public-key' && request.method === 'GET') {
        return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY });
      }

      if (path === '/api/push/subscribe' && request.method === 'POST') {
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        await db.prepare(`
          INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, organization_id)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, organization_id = excluded.organization_id
        `).bind(body.user_id, body.endpoint, body.keys?.p256dh, body.keys?.auth, orgId).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/push/unsubscribe' && request.method === 'POST') {
        const body = await request.json();
        await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(body.endpoint).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/push/register-fcm' && request.method === 'POST') {
        const body = await request.json();
        await db.prepare(`
          INSERT INTO fcm_tokens (user_id, token, platform)
          VALUES (?, ?, ?)
          ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform
        `).bind(body.user_id, body.token, body.platform || 'unknown').run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/call-memos/') && path.endsWith('/status') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        const orgId = parseOrgId(body.organization_id);
        const now = new Date().toISOString();
        await db.prepare(`
          UPDATE call_memos
          SET status = ?, resolved_by = ?, resolved_note = ?, resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END
          WHERE id = ? AND organization_id = ?
        `).bind(body.status, body.resolved_by || null, body.resolved_note || '', body.status, now, id, orgId).run();
        return jsonResponse({ success: true, status: body.status });
      }

      // 6. Messages Timeline & Reads
      if (path === '/api/messages' && request.method === 'GET') {
        const targetType = url.searchParams.get('target_type');
        const targetId = url.searchParams.get('target_id');
        const currentUserId = url.searchParams.get('current_user_id');

        let stmt;
        if (targetType === 'dm') {
          stmt = db.prepare(`
            SELECT m.*,
                   u.name as sender_name, u.avatar_color as sender_avatar, u.role as sender_role,
                   cm.id as memo_id, cm.company_name as memo_company, cm.contact_person as memo_contact, cm.phone_number as memo_phone,
                   cm.subject as memo_subject, cm.body as memo_body, cm.call_type as memo_type, cm.status as memo_status,
                   cm.resolved_note as memo_resolved_note, cm.resolved_at as memo_resolved_at,
                   ru.name as memo_resolver_name,
                   m.target_type as memo_target_type,
                   (SELECT name FROM users WHERE id = m.target_id) as memo_target_name,
                   (SELECT COUNT(*) FROM messages WHERE parent_id = m.id) as thread_count
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN call_memos cm ON m.call_memo_id = cm.id
            LEFT JOIN users ru ON cm.resolved_by = ru.id
            WHERE m.target_type = 'dm'
              AND m.parent_id IS NULL
              AND ((m.sender_id = ? AND m.target_id = ?) OR (m.sender_id = ? AND m.target_id = ?))
            ORDER BY m.created_at ASC
          `).bind(currentUserId, targetId, targetId, currentUserId);
        } else {
          stmt = db.prepare(`
            SELECT m.*,
                   u.name as sender_name, u.avatar_color as sender_avatar, u.role as sender_role,
                   cm.id as memo_id, cm.company_name as memo_company, cm.contact_person as memo_contact, cm.phone_number as memo_phone,
                   cm.subject as memo_subject, cm.body as memo_body, cm.call_type as memo_type, cm.status as memo_status,
                   cm.resolved_note as memo_resolved_note, cm.resolved_at as memo_resolved_at,
                   ru.name as memo_resolver_name,
                   m.target_type as memo_target_type,
                   CASE 
                     WHEN m.target_type = 'group' THEN (SELECT name FROM chat_groups WHERE id = m.target_id)
                     WHEN m.target_type = 'department' THEN (SELECT name FROM departments WHERE id = m.target_id)
                     ELSE NULL
                   END as memo_target_name,
                   (SELECT COUNT(*) FROM messages WHERE parent_id = m.id) as thread_count
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN call_memos cm ON m.call_memo_id = cm.id
            LEFT JOIN users ru ON cm.resolved_by = ru.id
            WHERE m.target_type = ? AND m.target_id = ? AND m.parent_id IS NULL
            ORDER BY m.created_at ASC
          `).bind(targetType, targetId);
        }

        const { results } = await stmt.all();
        if (!results || results.length === 0) return jsonResponse([]);

        const messageIds = results.map(m => m.id);
        const inClause = messageIds.map(() => '?').join(',');

        const readRes = await db.prepare(`
          SELECT mr.message_id, mr.user_id, mr.read_at, u.name as user_name
          FROM message_reads mr
          JOIN users u ON mr.user_id = u.id
          WHERE mr.message_id IN (${inClause})
        `).bind(...messageIds).all();

        const readMap = {};
        (readRes.results || []).forEach(r => {
          if (!readMap[r.message_id]) readMap[r.message_id] = [];
          readMap[r.message_id].push({ user_id: Number(r.user_id), name: r.user_name, read_at: r.read_at });
        });

        const formatted = results.map(m => {
          const readsForMsg = readMap[m.id] || [];
          const isReadByMe = readsForMsg.some(r => r.user_id === Number(currentUserId));
          return {
            ...m,
            read_count: readsForMsg.length,
            readers: readsForMsg,
            is_read_by_me: isReadByMe
          };
        });

        return jsonResponse(formatted);
      }

      if (path === '/api/messages' && request.method === 'POST') {
        const body = await request.json();
        const info = await db.prepare(`
          INSERT INTO messages (target_type, target_id, sender_id, message_type, content, call_memo_id, parent_id, attachment_url, attachment_name, attachment_type, attachment_size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(body.target_type, body.target_id, body.sender_id, body.message_type || 'text', body.content || '', body.call_memo_id || null, body.parent_id || null, body.attachment_url || null, body.attachment_name || null, body.attachment_type || null, body.attachment_size || null).run();

        const msgId = info.meta.last_row_id;
        await db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)')
          .bind(msgId, body.sender_id).run();

        if (body.message_type !== 'call_card' && !body.parent_id) {
          ctx.waitUntil((async () => {
            const recipientIds = await getMessageRecipientUserIds(db, body.target_type, body.target_id, body.sender_id);
            if (recipientIds.length === 0) return;
            const sender = await db.prepare('SELECT name FROM users WHERE id = ?').bind(body.sender_id).first();
            let title = sender?.name || '新着メッセージ';
            if (body.target_type === 'group') {
              const group = await db.prepare('SELECT name FROM groups WHERE id = ?').bind(body.target_id).first();
              if (group) title = `${sender?.name || '新着'} #${group.name}`;
            } else if (body.target_type === 'department') {
              const dept = await db.prepare('SELECT name FROM departments WHERE id = ?').bind(body.target_id).first();
              if (dept) title = `${sender?.name || '新着'} #${dept.name}`;
            }

            let previewBody = body.content?.trim();
            if (!previewBody) previewBody = body.message_type === 'image' ? '📷 画像を送信しました' : '📎 ファイルを送信しました';

            const pushData = {
              type: 'message',
              targetType: body.target_type,
              targetId: body.target_id,
              senderId: body.sender_id,
              url: `/?app=chat&target_type=${body.target_type}&target_id=${body.target_id}`
            };

            // @Mention detection for priority notifications
            const content = body.content || '';
            const isMentionAll = /@(全員|all)/i.test(content);
            const mentionedUserIds = new Set();

            if (isMentionAll) {
              recipientIds.forEach(id => mentionedUserIds.add(id));
            } else {
              const placeholders = recipientIds.map(() => '?').join(',');
              const { results: rUsers } = await db.prepare(
                `SELECT id, name FROM users WHERE id IN (${placeholders})`
              ).bind(...recipientIds).all();

              for (const u of (rUsers || [])) {
                if (content.includes(`@${u.name}`)) {
                  mentionedUserIds.add(u.id);
                }
              }
            }

            const normalRecipientIds = recipientIds.filter(id => !mentionedUserIds.has(id));
            const priorityRecipientIds = Array.from(mentionedUserIds);
            const priorityTitle = `📢 @あなた宛て: ${sender?.name || '新着'}`;

            const sendPromises = [];

            if (normalRecipientIds.length > 0) {
              sendPromises.push(
                sendFcmToUsers(env, normalRecipientIds, { title, body: previewBody.slice(0, 100), data: pushData }),
                sendWebPushToUsers(env, normalRecipientIds, { title, body: previewBody.slice(0, 100), data: pushData })
              );
            }

            if (priorityRecipientIds.length > 0) {
              sendPromises.push(
                sendFcmToUsers(env, priorityRecipientIds, { title: priorityTitle, body: previewBody.slice(0, 100), data: pushData }),
                sendWebPushToUsers(env, priorityRecipientIds, { title: priorityTitle, body: previewBody.slice(0, 100), data: pushData })
              );
            }

            await Promise.all(sendPromises);
          })());
        }

        return jsonResponse({ id: msgId, ...body, created_at: new Date().toISOString() });
      }

      if (path === '/api/messages/mark-read' && request.method === 'POST') {
        const body = await request.json();
        for (const mid of body.message_ids) {
          await db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)')
            .bind(mid, body.user_id).run();
        }
        return jsonResponse({ success: true });
      }

      if (path === '/api/messages/unread-summary' && request.method === 'GET') {
        const userId = Number(url.searchParams.get('user_id'));
        if (!userId) return jsonResponse({ total_unread: 0, by_target: {}, unread_items: [] });

        const { results } = await db.prepare(`
          SELECT m.id, m.target_type, m.target_id, m.sender_id, m.message_type, m.content, m.created_at,
                 u.name as sender_name
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.sender_id != ?
            AND m.parent_id IS NULL
            AND (
              (m.target_type IN ('dm', 'user') AND m.target_id = ?)
              OR (m.target_type = 'group' AND m.target_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
              OR (m.target_type = 'department' AND m.target_id IN (SELECT department_id FROM users WHERE id = ?))
            )
            AND NOT EXISTS (
              SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.user_id = ?
            )
          ORDER BY m.created_at DESC
        `).bind(userId, userId, userId, userId, userId).all();

        const byTarget = {};
        let totalUnread = 0;
        for (const item of (results || [])) {
          totalUnread++;
          const key = item.target_type === 'dm' ? `dm-${item.sender_id}` : `${item.target_type}-${item.target_id}`;
          byTarget[key] = (byTarget[key] || 0) + 1;
        }

        return jsonResponse({
          total_unread: totalUnread,
          by_target: byTarget,
          unread_items: results || []
        });
      }

      if (path.startsWith('/api/messages/') && path.endsWith('/thread') && request.method === 'GET') {
        const parentId = path.split('/')[3];
        const { results } = await db.prepare(`
          SELECT m.*, u.name as sender_name, u.avatar_color as sender_avatar, u.role as sender_role
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.parent_id = ?
          ORDER BY m.created_at ASC
        `).bind(parentId).all();
        return jsonResponse(results);
      }

      // 6b. Chat attachments (images / PDF)
      if (path === '/api/upload' && request.method === 'POST') {
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        const MAX_SIZE = 15 * 1024 * 1024; // 15MB

        const formData = await request.formData();
        const file = formData.get('file');
        const orgId = parseOrgId(formData.get('organization_id'));

        if (!file || typeof file === 'string') {
          return jsonResponse({ error: 'ファイルが見つかりません' }, 400);
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
          return jsonResponse({ error: '画像またはPDFのみアップロードできます' }, 400);
        }
        if (file.size > MAX_SIZE) {
          return jsonResponse({ error: 'ファイルサイズは15MBまでです' }, 400);
        }
        if (!env.ATTACHMENTS) {
          return jsonResponse({ error: 'ストレージが設定されていません' }, 500);
        }

        const extension = (file.name.split('.').pop() || 'bin').toLowerCase();
        const key = `orgs/${orgId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.ATTACHMENTS.put(key, arrayBuffer, {
          httpMetadata: { contentType: file.type }
        });

        const publicUrl = `https://${env.R2_PUBLIC_DOMAIN}/${key}`;
        return jsonResponse({
          url: publicUrl,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }

      // 7. Auth
      if (path === '/api/auth/signup' && request.method === 'POST') {
        const body = await request.json();
        const orgName = (body.organization_name || '').trim();
        const ownerName = (body.owner_name || '').trim();
        const email = (body.email || '').trim();
        const pin = body.pin || '';
        const slug = (body.slug || '').toLowerCase().trim();

        if (!orgName || !ownerName || !email) {
          return jsonResponse({ error: '組織名・氏名・IDは必須です' }, 400);
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse({ error: 'オーナーのIDは有効なメールアドレスを入力してください' }, 400);
        }
        if (!/^\d{4,8}$/.test(pin)) {
          return jsonResponse({ error: 'PINは4〜8桁の数字で入力してください' }, 400);
        }
        if (slug && (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug))) {
          return jsonResponse({ error: '専用URLは半角英数字とハイフンで3〜32文字（先頭は英数字）にしてください' }, 400);
        }

        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) return jsonResponse({ error: 'このIDはすでに使われています' }, 409);

        if (slug) {
          const slugTaken = await db.prepare('SELECT id FROM organizations WHERE slug = ?').bind(slug).first();
          if (slugTaken) return jsonResponse({ error: 'この専用URLは既に使われています' }, 409);
        }

        const orgInfo = await db.prepare('INSERT INTO organizations (name, slug) VALUES (?, ?)').bind(orgName, slug || null).run();
        const orgId = orgInfo.meta.last_row_id;
        const passwordHash = await hashPin(pin);

        let userInfo;
        try {
          userInfo = await db.prepare(`
            INSERT INTO users (name, email, password_hash, role, organization_id)
            VALUES (?, ?, ?, 'owner', ?)
          `).bind(ownerName, email, passwordHash, orgId).run();
        } catch (e) {
          await db.prepare('DELETE FROM organizations WHERE id = ?').bind(orgId).run();
          return jsonResponse({ error: 'このIDはすでに使われています' }, 409);
        }

        const token = generateToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userInfo.meta.last_row_id, expiresAt).run();

        return jsonResponse({
          token,
          user: { id: userInfo.meta.last_row_id, name: ownerName, email, role: 'owner', organization_id: orgId, must_change_pin: false },
          login_url: slug ? `https://${slug}.${SUBDOMAIN_BASE}` : null
        });
      }

      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json();
        const hostOrg = await resolveOrgFromHost(db, request);
        const user = hostOrg
          ? await db.prepare('SELECT * FROM users WHERE email = ? AND organization_id = ?').bind(body.email || '', hostOrg.id).first()
          : await db.prepare('SELECT * FROM users WHERE email = ?').bind(body.email || '').first();
        if (!user || !(await verifyPin(body.pin || '', user.password_hash))) {
          return jsonResponse({ error: 'メールアドレスまたはPINが正しくありません' }, 401);
        }
        const org = await db.prepare('SELECT status FROM organizations WHERE id = ?').bind(user.organization_id).first();
        if (org?.status === 'cancelled') {
          return jsonResponse({ error: 'この組織は現在利用できません。管理者にお問い合わせください。' }, 403);
        }
        const token = generateToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, user.id, expiresAt).run();
        return jsonResponse({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, organization_id: user.organization_id, must_change_pin: !!user.must_change_pin }
        });
      }

      if (path === '/api/auth/google' && request.method === 'POST') {
        if (!env.GOOGLE_CLIENT_ID) return jsonResponse({ error: 'Googleログインは未設定です' }, 500);
        const body = await request.json();
        if (!body.credential) return jsonResponse({ error: 'credential is required' }, 400);

        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`);
        if (!verifyRes.ok) return jsonResponse({ error: 'Googleトークンの検証に失敗しました' }, 401);
        const payload = await verifyRes.json();

        if (payload.aud !== env.GOOGLE_CLIENT_ID || payload.email_verified !== 'true') {
          return jsonResponse({ error: 'Googleトークンが無効です' }, 401);
        }

        const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(payload.email).first();
        if (!user) {
          return jsonResponse({ error: 'このメールアドレスは登録されていません。管理者に連絡してください。' }, 403);
        }

        const token = generateToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, user.id, expiresAt).run();
        return jsonResponse({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, organization_id: user.organization_id, must_change_pin: !!user.must_change_pin }
        });
      }

      if (path === '/api/auth/logout' && request.method === 'POST') {
        const auth = request.headers.get('Authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/auth/change-pin' && request.method === 'POST') {
        const session = await resolveSession(db, request);
        if (!session) return jsonResponse({ error: '認証が必要です' }, 401);

        const body = await request.json();
        const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(session.user_id).first();
        if (!(await verifyPin(body.current_pin || '', user.password_hash))) {
          return jsonResponse({ error: '現在のPINが正しくありません' }, 401);
        }
        if (!/^\d{4,8}$/.test(body.new_pin || '')) {
          return jsonResponse({ error: 'PINは4〜8桁の数字で入力してください' }, 400);
        }
        const newHash = await hashPin(body.new_pin);
        await db.prepare('UPDATE users SET password_hash = ?, must_change_pin = 0 WHERE id = ?').bind(newHash, session.user_id).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/auth/reset-pin' && request.method === 'POST') {
        const session = await resolveSession(db, request);
        if (!session || !STAFF_ROLES.includes(session.role)) return jsonResponse({ error: '管理者権限が必要です' }, 403);

        const body = await request.json();
        if (!/^\d{4,8}$/.test(body.new_pin || '')) {
          return jsonResponse({ error: 'PINは4〜8桁の数字で入力してください' }, 400);
        }
        const target = await db.prepare('SELECT id FROM users WHERE id = ? AND organization_id = ?')
          .bind(body.user_id, session.organization_id).first();
        if (!target) return jsonResponse({ error: '対象ユーザーが見つかりません' }, 404);

        const newHash = await hashPin(body.new_pin);
        await db.prepare('UPDATE users SET password_hash = ?, must_change_pin = 1 WHERE id = ?').bind(newHash, body.user_id).run();
        return jsonResponse({ success: true });
      }

      // 8. Platform admin (spans all organizations — separate credential/session system)
      if (path === '/api/platform/login' && request.method === 'POST') {
        const body = await request.json();
        const admin = await db.prepare('SELECT * FROM platform_admins WHERE email = ?').bind(body.email || '').first();
        if (!admin || !(await verifyPin(body.password || '', admin.password_hash))) {
          return jsonResponse({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
        }
        const token = generateToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        await db.prepare('INSERT INTO platform_sessions (token, platform_admin_id, expires_at) VALUES (?, ?, ?)').bind(token, admin.id, expiresAt).run();
        return jsonResponse({ token, admin: { id: admin.id, email: admin.email } });
      }

      if (path === '/api/platform/logout' && request.method === 'POST') {
        const auth = request.headers.get('Authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (token) await db.prepare('DELETE FROM platform_sessions WHERE token = ?').bind(token).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/platform/organizations' && request.method === 'GET') {
        const platformSession = await resolvePlatformSession(db, request);
        if (!platformSession) return jsonResponse({ error: '認証が必要です' }, 401);

        const { results } = await db.prepare(`
          SELECT
            o.id, o.name, o.status, o.created_at, o.cancelled_at, o.plan_tier, o.storage_limit_bytes,
            (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
            (SELECT COUNT(*) FROM departments WHERE organization_id = o.id) as department_count,
            (SELECT COUNT(*) FROM chat_groups WHERE organization_id = o.id) as group_count,
            (SELECT COUNT(*) FROM call_memos WHERE organization_id = o.id) as call_memo_count,
            (SELECT COUNT(*) FROM call_memos WHERE organization_id = o.id AND status = 'pending') as pending_call_memo_count,
            (SELECT MAX(created_at) FROM call_memos WHERE organization_id = o.id) as last_call_memo_at,
            (SELECT MAX(m.created_at) FROM messages m JOIN chat_groups g ON m.target_id = g.id AND m.target_type = 'group' WHERE g.organization_id = o.id) as last_message_at,
            (SELECT COALESCE(SUM(m.attachment_size), 0) FROM messages m JOIN chat_groups g ON m.target_id = g.id AND m.target_type = 'group' WHERE g.organization_id = o.id) as storage_used_bytes
          FROM organizations o
          ORDER BY o.id ASC
        `).all();
        return jsonResponse(results);
      }

      if (path.match(/^\/api\/platform\/organizations\/\d+\/storage-limit$/) && request.method === 'POST') {
        const platformSession = await resolvePlatformSession(db, request);
        if (!platformSession) return jsonResponse({ error: '認証が必要です' }, 401);
        const id = path.split('/')[4];
        const body = await request.json();
        const bytes = Number(body.storage_limit_bytes);
        if (!Number.isFinite(bytes) || bytes <= 0) return jsonResponse({ error: '容量の値が不正です' }, 400);
        await db.prepare('UPDATE organizations SET storage_limit_bytes = ? WHERE id = ?').bind(bytes, id).run();
        return jsonResponse({ success: true });
      }

      if (path.match(/^\/api\/platform\/organizations\/\d+\/cancel$/) && request.method === 'POST') {
        const platformSession = await resolvePlatformSession(db, request);
        if (!platformSession) return jsonResponse({ error: '認証が必要です' }, 401);
        const id = path.split('/')[4];
        await db.prepare("UPDATE organizations SET status = 'cancelled', cancelled_at = ? WHERE id = ?")
          .bind(new Date().toISOString(), id).run();
        await db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE organization_id = ?)').bind(id).run();
        return jsonResponse({ success: true });
      }

      if (path.match(/^\/api\/platform\/organizations\/\d+\/reactivate$/) && request.method === 'POST') {
        const platformSession = await resolvePlatformSession(db, request);
        if (!platformSession) return jsonResponse({ error: '認証が必要です' }, 401);
        const id = path.split('/')[4];
        await db.prepare("UPDATE organizations SET status = 'active', cancelled_at = NULL WHERE id = ?").bind(id).run();
        return jsonResponse({ success: true });
      }

      if (path.match(/^\/api\/platform\/organizations\/\d+$/) && request.method === 'DELETE') {
        const platformSession = await resolvePlatformSession(db, request);
        if (!platformSession) return jsonResponse({ error: '認証が必要です' }, 401);
        const id = path.split('/')[4];

        const org = await db.prepare('SELECT status FROM organizations WHERE id = ?').bind(id).first();
        if (!org) return jsonResponse({ error: '組織が見つかりません' }, 404);
        if (org.status !== 'cancelled') {
          return jsonResponse({ error: '完全削除の前に、まず解約済みにしてください' }, 400);
        }

        const { results: userIds } = await db.prepare('SELECT id FROM users WHERE organization_id = ?').bind(id).all();
        const ids = userIds.map(u => u.id);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          await db.prepare(`DELETE FROM sessions WHERE user_id IN (${placeholders})`).bind(...ids).run();
          await db.prepare(`DELETE FROM push_subscriptions WHERE user_id IN (${placeholders})`).bind(...ids).run();
          await db.prepare(`DELETE FROM fcm_tokens WHERE user_id IN (${placeholders})`).bind(...ids).run();
        }
        await db.prepare('DELETE FROM message_reads WHERE user_id IN (SELECT id FROM users WHERE organization_id = ?)').bind(id).run();
        await db.prepare(`DELETE FROM messages WHERE target_type = 'group' AND target_id IN (SELECT id FROM chat_groups WHERE organization_id = ?)`).bind(id).run();
        await db.prepare('DELETE FROM group_members WHERE group_id IN (SELECT id FROM chat_groups WHERE organization_id = ?)').bind(id).run();
        await db.prepare('DELETE FROM chat_groups WHERE organization_id = ?').bind(id).run();
        await db.prepare('DELETE FROM call_memos WHERE organization_id = ?').bind(id).run();
        await db.prepare('DELETE FROM caller_contacts WHERE organization_id = ?').bind(id).run();
        await db.prepare('DELETE FROM users WHERE organization_id = ?').bind(id).run();
        await db.prepare('DELETE FROM departments WHERE organization_id = ?').bind(id).run();
        await db.prepare('DELETE FROM organizations WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }

      return jsonResponse({ error: 'Endpoint Not Found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

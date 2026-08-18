import { deserializeVapidKeys, sendPushNotification } from 'web-push-browser';

async function sendPushToSubscribers(env, excludeUserId, memo) {
  const { results: subs } = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id != ?')
    .bind(excludeUserId || -1).all();
  if (!subs || subs.length === 0) return;

  const vapidKeys = await deserializeVapidKeys({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  });

  const payload = JSON.stringify({
    title: `📞 ${memo.company_name} より受電`,
    body: memo.contact_person ? `${memo.contact_person} 様` : (memo.subject || '内容を確認してください'),
    memoId: memo.id
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

    const path = url.pathname;
    const db = env.DB;

    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    try {
      // 1. Users
      if (path === '/api/users' && request.method === 'GET') {
        const { results } = await db.prepare(`
          SELECT u.id, u.name, u.email, u.avatar_color, u.role, u.department_id, d.name as department_name, u.created_at
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          ORDER BY u.id ASC
        `).all();
        return jsonResponse(results);
      }

      if (path === '/api/users' && request.method === 'POST') {
        const body = await request.json();
        const info = await db.prepare(`
          INSERT INTO users (name, email, password, department_id, role, avatar_color)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(body.name, body.email, body.password || 'password123', body.department_id || null, body.role || 'user', body.avatar_color || '#3b82f6').run();
        return jsonResponse({ id: info.meta.last_row_id, ...body });
      }

      if (path.startsWith('/api/users/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        await db.prepare(`
          UPDATE users SET name = ?, email = ?, department_id = ?, role = ?, avatar_color = ? WHERE id = ?
        `).bind(body.name, body.email, body.department_id || null, body.role || 'user', body.avatar_color || '#3b82f6', id).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/users/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }

      // 2. Departments
      if (path === '/api/departments' && request.method === 'GET') {
        const { results } = await db.prepare(`
          SELECT d.id, d.name, d.created_at, COUNT(u.id) as user_count
          FROM departments d
          LEFT JOIN users u ON d.id = u.department_id
          GROUP BY d.id
          ORDER BY d.id ASC
        `).all();
        return jsonResponse(results);
      }

      if (path === '/api/departments' && request.method === 'POST') {
        const body = await request.json();
        const info = await db.prepare('INSERT INTO departments (name) VALUES (?)').bind(body.name).run();
        return jsonResponse({ id: info.meta.last_row_id, name: body.name, user_count: 0 });
      }

      if (path.startsWith('/api/departments/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        await db.prepare('UPDATE departments SET name = ? WHERE id = ?').bind(body.name, id).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/departments/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        await db.prepare('DELETE FROM departments WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }

      // 3. Groups
      if (path === '/api/groups' && request.method === 'GET') {
        const { results } = await db.prepare(`
          SELECT g.*, 
                 (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
                 (SELECT GROUP_CONCAT(user_id) FROM group_members WHERE group_id = g.id) as member_ids_str
          FROM chat_groups g
          ORDER BY g.created_at DESC
        `).all();
        const mapped = results.map(r => ({
          ...r,
          member_ids: r.member_ids_str ? r.member_ids_str.split(',').map(Number) : []
        }));
        return jsonResponse(mapped);
      }

      if (path === '/api/groups' && request.method === 'POST') {
        const body = await request.json();
        const info = await db.prepare(
          'INSERT INTO chat_groups (name, description, icon, created_by) VALUES (?, ?, ?, ?)'
        ).bind(body.name, body.description || '', body.icon || '👥', body.created_by || 1).run();
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
        await db.prepare('UPDATE chat_groups SET name = ?, description = ?, icon = ? WHERE id = ?')
          .bind(body.name, body.description || '', body.icon || '👥', id).run();
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
        await db.prepare('DELETE FROM group_members WHERE group_id = ?').bind(id).run();
        await db.prepare('DELETE FROM messages WHERE target_type = "group" AND target_id = ?').bind(id).run();
        await db.prepare('DELETE FROM chat_groups WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }

      // 4. Caller Contacts
      if (path === '/api/contacts' && request.method === 'GET') {
        const q = url.searchParams.get('q');
        let query = 'SELECT * FROM caller_contacts ORDER BY call_count DESC, last_called_at DESC';
        let stmt;
        if (q) {
          stmt = db.prepare('SELECT * FROM caller_contacts WHERE company_name LIKE ? OR contact_person LIKE ? OR phone_number LIKE ? ORDER BY call_count DESC')
            .bind(`%${q}%`, `%${q}%`, `%${q}%`);
        } else {
          stmt = db.prepare(query);
        }
        const { results } = await stmt.all();
        return jsonResponse(results);
      }

      if (path === '/api/contacts' && request.method === 'POST') {
        const body = await request.json();
        const info = await db.prepare(
          'INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes) VALUES (?, ?, ?, ?)'
        ).bind(body.company_name, body.contact_person || '', body.phone_number, body.frequent_notes || '').run();
        return jsonResponse({ id: info.meta.last_row_id, ...body, call_count: 0 });
      }

      if (path.startsWith('/api/contacts/') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        await db.prepare(
          'UPDATE caller_contacts SET company_name = ?, contact_person = ?, phone_number = ?, frequent_notes = ? WHERE id = ?'
        ).bind(body.company_name, body.contact_person, body.phone_number, body.frequent_notes, id).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/contacts/') && request.method === 'DELETE') {
        const id = path.split('/')[3];
        await db.prepare('DELETE FROM caller_contacts WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }

      // 5. Call Memos
      if (path === '/api/call-memos' && request.method === 'GET') {
        const { results } = await db.prepare(`
          SELECT cm.*, 
                 cu.name as creator_name, cu.avatar_color as creator_avatar,
                 ru.name as resolver_name
          FROM call_memos cm
          LEFT JOIN users cu ON cm.created_by = cu.id
          LEFT JOIN users ru ON cm.resolved_by = ru.id
          ORDER BY cm.created_at DESC
        `).all();
        return jsonResponse(results);
      }

      if (path === '/api/call-memos' && request.method === 'POST') {
        const body = await request.json();
        const now = new Date().toISOString();
        let contactId = body.caller_contact_id;

        if (contactId) {
          await db.prepare('UPDATE caller_contacts SET call_count = call_count + 1, last_called_at = ? WHERE id = ?')
            .bind(now, contactId).run();
        } else if (body.save_contact) {
          const cInfo = await db.prepare(
            'INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes, call_count, last_called_at) VALUES (?, ?, ?, ?, 1, ?)'
          ).bind(body.company_name, body.contact_person || '', body.phone_number || '', body.frequent_notes || '', now).run();
          contactId = cInfo.meta.last_row_id;
        }

        const memoInfo = await db.prepare(`
          INSERT INTO call_memos (caller_contact_id, company_name, contact_person, phone_number, subject, body, call_type, status, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).bind(contactId || null, body.company_name, body.contact_person || '', body.phone_number || '', body.subject || '受電連絡', body.body || '', body.call_type || 'callback', body.created_by || 1).run();

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
        }));

        return jsonResponse({ id: memoId, company_name: body.company_name, status: 'pending' });
      }

      // 5b. Push Notification Subscriptions
      if (path === '/api/push/vapid-public-key' && request.method === 'GET') {
        return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY });
      }

      if (path === '/api/push/subscribe' && request.method === 'POST') {
        const body = await request.json();
        await db.prepare(`
          INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
        `).bind(body.user_id, body.endpoint, body.keys?.p256dh, body.keys?.auth).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/push/unsubscribe' && request.method === 'POST') {
        const body = await request.json();
        await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(body.endpoint).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/call-memos/') && path.endsWith('/status') && request.method === 'PUT') {
        const id = path.split('/')[3];
        const body = await request.json();
        const now = new Date().toISOString();
        await db.prepare(`
          UPDATE call_memos 
          SET status = ?, resolved_by = ?, resolved_note = ?, resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END
          WHERE id = ?
        `).bind(body.status, body.resolved_by || null, body.resolved_note || '', body.status, now, id).run();
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
          INSERT INTO messages (target_type, target_id, sender_id, message_type, content, call_memo_id, parent_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(body.target_type, body.target_id, body.sender_id, body.message_type || 'text', body.content || '', body.call_memo_id || null, body.parent_id || null).run();

        const msgId = info.meta.last_row_id;
        await db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)')
          .bind(msgId, body.sender_id).run();

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

      return jsonResponse({ error: 'Endpoint Not Found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

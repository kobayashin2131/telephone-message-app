const express = require('express');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

console.log('Connected to SQLite via node:sqlite');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT 'password123',
    avatar_color TEXT DEFAULT '#3b82f6',
    department_id INTEGER,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS chat_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '👥',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS caller_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone_number TEXT NOT NULL,
    frequent_notes TEXT,
    call_count INTEGER DEFAULT 0,
    last_called_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS call_memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_contact_id INTEGER,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone_number TEXT,
    subject TEXT,
    body TEXT,
    call_type TEXT DEFAULT 'callback',
    status TEXT DEFAULT 'pending',
    created_by INTEGER NOT NULL,
    resolved_by INTEGER,
    resolved_at DATETIME,
    resolved_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caller_contact_id) REFERENCES caller_contacts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message_type TEXT DEFAULT 'text',
    content TEXT,
    call_memo_id INTEGER,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (call_memo_id) REFERENCES call_memos(id)
  );

  CREATE TABLE IF NOT EXISTS message_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(message_id, user_id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get();
if (!userCount || userCount.count === 0) {
  console.log('Seeding initial CallSync master & sample data...');
  db.exec(`
    INSERT INTO departments (id, name) VALUES 
      (1, '営業部'), 
      (2, '施工管理部'), 
      (3, '総務・人事部'), 
      (4, 'カスタマーサポート');

    INSERT INTO users (id, name, email, password, avatar_color, department_id, role) VALUES 
      (1, '佐藤 健太（管理者）', 'admin@example.com', 'admin123', '#2563eb', 3, 'admin'),
      (2, '田中 一郎', 'tanaka@example.com', 'password123', '#059669', 1, 'user'),
      (3, '高橋 誠', 'takahashi@example.com', 'password123', '#d97706', 1, 'user'),
      (4, '鈴木 花子', 'suzuki@example.com', 'password123', '#7c3aed', 2, 'user'),
      (5, '渡辺 直美', 'watanabe@example.com', 'password123', '#db2777', 3, 'user'),
      (6, '小林 雄大', 'kobayashi@example.com', 'password123', '#0284c7', 4, 'user');

    INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes, call_count, last_called_at) VALUES 
      ('株式会社オアシス商事', '山田 太郎 様', '03-1234-5678', '納期確認または再見積もりの件が多い。営業田中宛て。', 12, '2026-08-17 14:30:00'),
      ('山田工務店', '山田 代表', '090-9876-5432', '現場の施工進捗・図面確認の連絡が多い。施工管理部宛て。', 8, '2026-08-17 11:15:00'),
      ('株式会社グローバルリンク', '佐々木 課長', '06-8765-4321', '新規提携・定期保守契約の件。', 5, '2026-08-16 16:00:00'),
      ('日本サプライ株式会社', '発注担当 伊藤 様', '03-5555-4444', '部材納品日の連絡。', 3, '2026-08-15 09:20:00');

    INSERT INTO chat_groups (id, name, description, icon, created_by) VALUES 
      (1, '新製品・秋展示会PJ', '10月の新製品発表・展示会ブース準備メンバー', '🚀', 1),
      (2, '現場トラブル・緊急対応', '施工現場・クライアントトラブル時の即時共有ライン', '🚨', 1);

    INSERT INTO group_members (group_id, user_id) VALUES 
      (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
      (2, 1), (2, 2), (2, 4), (2, 6);

    INSERT INTO call_memos (id, caller_contact_id, company_name, contact_person, phone_number, subject, body, call_type, status, created_by) VALUES 
      (1, 1, '株式会社オアシス商事', '山田 太郎 様', '03-1234-5678', '見積書再発行の依頼', '先週提出した見積もりの仕様変更について折り返しがほしいとのことです。本日17時まで社内にいらっしゃいます。', 'callback', 'pending', 5);

    INSERT INTO messages (target_type, target_id, sender_id, message_type, content, call_memo_id) VALUES 
      ('group', 1, 1, 'text', '秋の展示会プロジェクトルームを作成しました！皆さんよろしくお願いします🙌', NULL),
      ('dm', 2, 5, 'call_card', '株式会社オアシス商事 山田様よりお電話がありました。折り返しをお願いします。', 1);

    INSERT INTO message_reads (message_id, user_id) VALUES (1, 1), (1, 2), (1, 4), (2, 5);
  `);
}

// Helper: convert BigInt to Number for JSON serialization
function sanitize(rows) {
  return JSON.parse(JSON.stringify(rows, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Users
app.get('/api/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, u.role, u.department_id, d.name as department_name, u.created_at
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `).all();
  res.json(sanitize(users));
});

app.post('/api/users', (req, res) => {
  const { name, email, password, department_id, role, avatar_color } = req.body;
  if (!name || !email) return res.status(400).json({ error: '名前とメールアドレスは必須です' });
  const color = avatar_color || '#3b82f6';
  try {
    const info = db.prepare(`
      INSERT INTO users (name, email, password, department_id, role, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, password || 'password123', department_id || null, role || 'user', color);
    res.json(sanitize({ id: info.lastInsertRowid, name, email, department_id, role, avatar_color: color }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  const { name, email, department_id, role, avatar_color } = req.body;
  try {
    db.prepare(`
      UPDATE users SET name = ?, email = ?, department_id = ?, role = ?, avatar_color = ? WHERE id = ?
    `).run(name, email, department_id || null, role || 'user', avatar_color || '#3b82f6', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Departments
app.get('/api/departments', (req, res) => {
  const depts = db.prepare(`
    SELECT d.id, d.name, d.created_at, COUNT(u.id) as user_count
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();
  res.json(sanitize(depts));
});

app.post('/api/departments', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '部門名は必須です' });
  try {
    const info = db.prepare('INSERT INTO departments (name) VALUES (?)').run(name);
    res.json(sanitize({ id: info.lastInsertRowid, name, user_count: 0 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/departments/:id', (req, res) => {
  const { name } = req.body;
  try {
    db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/departments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Groups
app.get('/api/groups', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, 
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
           (SELECT GROUP_CONCAT(user_id) FROM group_members WHERE group_id = g.id) as member_ids_str
    FROM chat_groups g
    ORDER BY g.created_at DESC
  `).all();
  const results = groups.map(g => ({
    ...g,
    member_ids: g.member_ids_str ? g.member_ids_str.split(',').map(Number) : []
  }));
  res.json(sanitize(results));
});

app.post('/api/groups', (req, res) => {
  const { name, description, icon, created_by, member_ids } = req.body;
  if (!name) return res.status(400).json({ error: 'グループ名は必須です' });
  const iconVal = icon || '👥';
  try {
    const info = db.prepare(
      'INSERT INTO chat_groups (name, description, icon, created_by) VALUES (?, ?, ?, ?)'
    ).run(name, description || '', iconVal, created_by || 1);
    const groupId = info.lastInsertRowid;

    const allMembers = Array.from(new Set([created_by || 1, ...(member_ids || [])]));
    const stmt = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)');
    allMembers.forEach(uid => stmt.run(groupId, uid));

    // Post welcome message
    db.prepare(
      'INSERT INTO messages (target_type, target_id, sender_id, message_type, content) VALUES (?, ?, ?, ?, ?)'
    ).run('group', groupId, created_by || 1, 'system', `グループ「${name}」が作成されました！`);

    res.json(sanitize({ id: groupId, name, description, icon: iconVal, member_count: allMembers.length, member_ids: allMembers }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/groups/:id', (req, res) => {
  const { name, description, icon, member_ids } = req.body;
  const groupId = req.params.id;
  try {
    db.prepare('UPDATE chat_groups SET name = ?, description = ?, icon = ? WHERE id = ?')
      .run(name, description || '', icon || '👥', groupId);
    if (member_ids && Array.isArray(member_ids)) {
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
      const stmt = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
      member_ids.forEach(uid => stmt.run(groupId, uid));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  const groupId = req.params.id;
  try {
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM messages WHERE target_type = "group" AND target_id = ?').run(groupId);
    db.prepare('DELETE FROM chat_groups WHERE id = ?').run(groupId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Caller Contacts (受電先マスタ)
app.get('/api/contacts', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db.prepare(`
      SELECT * FROM caller_contacts 
      WHERE company_name LIKE ? OR contact_person LIKE ? OR phone_number LIKE ? 
      ORDER BY call_count DESC
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM caller_contacts ORDER BY call_count DESC, last_called_at DESC').all();
  }
  res.json(sanitize(rows));
});

app.post('/api/contacts', (req, res) => {
  const { company_name, contact_person, phone_number, frequent_notes } = req.body;
  if (!company_name || !phone_number) {
    return res.status(400).json({ error: '会社名と電話番号は必須です' });
  }
  try {
    const info = db.prepare(
      'INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes) VALUES (?, ?, ?, ?)'
    ).run(company_name, contact_person || '', phone_number, frequent_notes || '');
    res.json(sanitize({ id: info.lastInsertRowid, company_name, contact_person, phone_number, frequent_notes, call_count: 0 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contacts/:id', (req, res) => {
  const { company_name, contact_person, phone_number, frequent_notes } = req.body;
  try {
    db.prepare(
      'UPDATE caller_contacts SET company_name = ?, contact_person = ?, phone_number = ?, frequent_notes = ? WHERE id = ?'
    ).run(company_name, contact_person, phone_number, frequent_notes, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM caller_contacts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Call Memos
app.get('/api/call-memos', (req, res) => {
  const memos = db.prepare(`
    SELECT cm.*, 
           cu.name as creator_name, cu.avatar_color as creator_avatar,
           ru.name as resolver_name
    FROM call_memos cm
    LEFT JOIN users cu ON cm.created_by = cu.id
    LEFT JOIN users ru ON cm.resolved_by = ru.id
    ORDER BY cm.created_at DESC
  `).all();
  res.json(sanitize(memos));
});

app.post('/api/call-memos', (req, res) => {
  const {
    caller_contact_id,
    company_name,
    contact_person,
    phone_number,
    subject,
    body,
    call_type,
    created_by,
    save_contact,
    frequent_notes,
    target_type,
    target_id
  } = req.body;

  if (!company_name) return res.status(400).json({ error: '会社名は必須です' });

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let contactId = caller_contact_id;

  try {
    if (contactId) {
      db.prepare('UPDATE caller_contacts SET call_count = call_count + 1, last_called_at = ? WHERE id = ?')
        .run(now, contactId);
    } else if (save_contact) {
      const cInfo = db.prepare(
        'INSERT INTO caller_contacts (company_name, contact_person, phone_number, frequent_notes, call_count, last_called_at) VALUES (?, ?, ?, ?, 1, ?)'
      ).run(company_name, contact_person || '', phone_number || '', frequent_notes || '', now);
      contactId = cInfo.lastInsertRowid;
    }

    const memoInfo = db.prepare(`
      INSERT INTO call_memos (caller_contact_id, company_name, contact_person, phone_number, subject, body, call_type, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(contactId || null, company_name, contact_person || '', phone_number || '', subject || '受電連絡', body || '', call_type || 'callback', created_by || 1);
    
    const memoId = memoInfo.lastInsertRowid;

    let messageId = null;
    if (target_type && target_id) {
      const cardSummary = `📞 【受電】${company_name} ${contact_person || ''}様より連絡`;
      const msgInfo = db.prepare(`
        INSERT INTO messages (target_type, target_id, sender_id, message_type, content, call_memo_id)
        VALUES (?, ?, ?, 'call_card', ?, ?)
      `).run(target_type, target_id, created_by || 1, cardSummary, memoId);
      messageId = msgInfo.lastInsertRowid;

      // sender marks as read
      db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)').run(messageId, created_by || 1);
    }

    res.json(sanitize({ id: memoId, message_id: messageId, company_name, status: 'pending' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/call-memos/:id/status', (req, res) => {
  const { status, resolved_by, resolved_note } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  try {
    db.prepare(`
      UPDATE call_memos 
      SET status = ?, resolved_by = ?, resolved_note = ?, resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END
      WHERE id = ?
    `).run(status, resolved_by || null, resolved_note || '', status, now, req.params.id);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Messages Timeline & Read Receipts
app.get('/api/messages', (req, res) => {
  const { target_type, target_id, current_user_id } = req.query;
  if (!target_type || !target_id) {
    return res.status(400).json({ error: 'target_type and target_id are required' });
  }

  let messages = [];
  if (target_type === 'dm') {
    messages = db.prepare(`
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
    `).all(current_user_id, target_id, target_id, current_user_id);
  } else {
    messages = db.prepare(`
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
    `).all(target_type, target_id);
  }

  if (messages.length === 0) return res.json([]);

  const messageIds = messages.map(m => m.id);
  const inClause = messageIds.map(() => '?').join(',');

  const reads = db.prepare(`
    SELECT mr.message_id, mr.user_id, mr.read_at, u.name as user_name
    FROM message_reads mr
    JOIN users u ON mr.user_id = u.id
    WHERE mr.message_id IN (${inClause})
  `).all(...messageIds);

  const readMap = {};
  reads.forEach(r => {
    if (!readMap[r.message_id]) readMap[r.message_id] = [];
    readMap[r.message_id].push({ user_id: Number(r.user_id), name: r.user_name, read_at: r.read_at });
  });

  const results = messages.map(m => {
    const readsForMsg = readMap[m.id] || [];
    const isReadByMe = readsForMsg.some(r => r.user_id === Number(current_user_id));
    return {
      ...m,
      read_count: readsForMsg.length,
      readers: readsForMsg,
      is_read_by_me: isReadByMe
    };
  });

  res.json(sanitize(results));
});

app.post('/api/messages', (req, res) => {
  const { target_type, target_id, sender_id, content, message_type, call_memo_id, parent_id } = req.body;
  if (!content && !call_memo_id) {
    return res.status(400).json({ error: 'メッセージ内容は必須です' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO messages (target_type, target_id, sender_id, message_type, content, call_memo_id, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(target_type, target_id, sender_id, message_type || 'text', content || '', call_memo_id || null, parent_id || null);
    
    const msgId = info.lastInsertRowid;
    db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)').run(msgId, sender_id);

    res.json(sanitize({ id: msgId, target_type, target_id, sender_id, content, message_type, created_at: new Date().toISOString() }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/mark-read', (req, res) => {
  const { message_ids, user_id } = req.body;
  if (!message_ids || !Array.isArray(message_ids) || !user_id) {
    return res.status(400).json({ error: 'message_ids and user_id required' });
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)');
  message_ids.forEach(mid => stmt.run(mid, user_id));
  res.json({ success: true, count: message_ids.length });
});

app.get('/api/messages/:id/thread', (req, res) => {
  const parentId = req.params.id;
  const rows = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar_color as sender_avatar, u.role as sender_role
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.parent_id = ?
    ORDER BY m.created_at ASC
  `).all(parentId);
  res.json(sanitize(rows));
});

app.listen(PORT, () => {
  console.log(`🚀 CallSync API Server running on http://localhost:${PORT}`);
});

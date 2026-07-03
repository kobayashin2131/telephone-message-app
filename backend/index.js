const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department_id INTEGER,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        receiver_name TEXT NOT NULL,
        caller_name TEXT NOT NULL,
        caller_number TEXT,
        message TEXT,
        is_urgent INTEGER DEFAULT 0,
        is_resolved INTEGER DEFAULT 0,
        resolved_at TEXT,
        resolved_by TEXT,
        resolved_memo TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS message_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        department_id INTEGER,
        user_id INTEGER,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        FOREIGN KEY (department_id) REFERENCES departments(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Seed initial data
      db.get("SELECT count(*) as count FROM departments", (err, row) => {
        if (row && row.count === 0) {
          const deps = ['営業部', '工事部', '総務部'];
          const stmt = db.prepare('INSERT INTO departments (name) VALUES (?)');
          deps.forEach(d => stmt.run(d));
          stmt.finalize();

          setTimeout(() => {
            const users = [
              { name: '田中 太郎', depId: 1 },
              { name: '山田 花子', depId: 1 },
              { name: '鈴木 一郎', depId: 2 },
              { name: '高橋 健太', depId: 2 },
              { name: '佐藤 次郎', depId: 3 }
            ];
            const stmtUser = db.prepare('INSERT INTO users (name, department_id) VALUES (?, ?)');
            users.forEach(u => stmtUser.run(u.name, u.depId));
            stmtUser.finalize();
          }, 100);
        }
      });
    });
  }
});

// --- API Endpoints ---

app.get('/api/departments', (req, res) => {
  db.all('SELECT * FROM departments', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const getMessagesQuery = `
  SELECT m.*, 
    json_group_array(
      json_object(
        'type', CASE WHEN mt.user_id IS NOT NULL THEN 'user' ELSE 'department' END,
        'department_id', mt.department_id,
        'user_id', mt.user_id,
        'name', COALESCE(u.name, d.name)
      )
    ) as targets
  FROM messages m
  LEFT JOIN message_targets mt ON m.id = mt.message_id
  LEFT JOIN users u ON mt.user_id = u.id
  LEFT JOIN departments d ON mt.department_id = d.id
`;

app.get('/api/messages', (req, res) => {
  const query = `
    ${getMessagesQuery}
    WHERE m.is_resolved = 0 OR m.resolved_at > date('now', '-1 day')
    GROUP BY m.id
    ORDER BY m.is_urgent DESC, m.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({...r, targets: JSON.parse(r.targets)})));
  });
});

app.get('/api/messages/search', (req, res) => {
  const { q } = req.query;
  let query = `${getMessagesQuery} `;
  let params = [];
  
  if (q) {
    query += `WHERE m.message LIKE ? OR m.caller_name LIKE ? OR m.receiver_name LIKE ? `;
    const searchStr = `%${q}%`;
    params = [searchStr, searchStr, searchStr];
  }
  
  query += `GROUP BY m.id ORDER BY m.created_at DESC LIMIT 100`;
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({...r, targets: JSON.parse(r.targets)})));
  });
});

app.post('/api/messages', (req, res) => {
  const { caller_name, caller_number, receiver_name, message, is_urgent, targets } = req.body;
  const created_at = new Date().toISOString();
  
  db.serialize(() => {
    db.run(`
      INSERT INTO messages (created_at, receiver_name, caller_name, caller_number, message, is_urgent)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [created_at, receiver_name, caller_name, caller_number, message, is_urgent ? 1 : 0], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const messageId = this.lastID;
      const stmt = db.prepare('INSERT INTO message_targets (message_id, department_id, user_id) VALUES (?, ?, ?)');
      
      targets.forEach(t => {
        stmt.run(messageId, t.department_id || null, t.user_id || null);
      });
      stmt.finalize();

      console.log(`[Google Chat Webhook Mock] New message from ${caller_name} received by ${receiver_name}`);
      res.status(201).json({ id: messageId });
    });
  });
});

app.put('/api/messages/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolved_by, resolved_memo } = req.body;
  const resolved_at = new Date().toISOString();

  const query = `
    UPDATE messages 
    SET is_resolved = 1, resolved_at = ?, resolved_by = ?, resolved_memo = ?
    WHERE id = ?
  `;
  
  db.run(query, [resolved_at, resolved_by, resolved_memo, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});



DROP TABLE IF EXISTS message_reads;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS call_memos;
DROP TABLE IF EXISTS caller_contacts;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS chat_groups;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS organizations;

CREATE TABLE organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO organizations (id, name) VALUES (1, 'デフォルト組織');

CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT DEFAULT 'password123',
  avatar_color TEXT DEFAULT '#3b82f6',
  department_id INTEGER,
  role TEXT DEFAULT 'user',
  organization_id INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE chat_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '👥',
  created_by INTEGER NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES chat_groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(group_id, user_id)
);

CREATE TABLE caller_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone_number TEXT NOT NULL,
  frequent_notes TEXT,
  call_count INTEGER DEFAULT 0,
  last_called_at DATETIME,
  organization_id INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE call_memos (
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
  organization_id INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caller_contact_id) REFERENCES caller_contacts(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  call_memo_id INTEGER,
  parent_id INTEGER,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (call_memo_id) REFERENCES call_memos(id)
);

CREATE TABLE message_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(message_id, user_id)
);

-- Initial Seed Data
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

CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE fcm_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

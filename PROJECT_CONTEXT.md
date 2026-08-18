# 📋 Connect Suite プロジェクト詳細仕様書 (PROJECT_CONTEXT)

## 1. データベース設計 (Cloudflare D1 / SQLite)

```sql
-- ユーザー
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department_id INTEGER,
  role TEXT DEFAULT 'user', -- 'admin' | 'user'
  avatar_color TEXT DEFAULT '#4f46e5',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 部署マスター
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- グループ / チャンネル
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💬',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- メッセージ (通常テキスト ＆ 電話メモ通知)
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL, -- 'group' | 'dm' | 'department'
  target_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text' | 'call_memo' | 'system'
  call_memo_id INTEGER,
  parent_id INTEGER, -- スレッド返信用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 電話連絡メモ
CREATE TABLE call_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone_number TEXT,
  target_type TEXT NOT NULL, -- 'department' | 'user' | 'dm'
  target_id INTEGER NOT NULL,
  call_type TEXT DEFAULT 'callback', -- 'callback' | 'take_message' | 'will_call_again' | 'notice'
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'unhandled', -- 'unhandled' | 'in_progress' | 'resolved'
  resolved_by INTEGER,
  resolved_at DATETIME,
  resolved_note TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 受電先台帳 (取引先連絡先)
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone_number TEXT,
  furigana TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. API エンドポイント一覧

ベースURL: `https://callsync-backend.nonba30.workers.dev/api`

| メソッド | パス | 説明 |
| :--- | :--- | :--- |
| `GET` | `/api/users` | 全ユーザー取得 |
| `POST` | `/api/users` | ユーザー作成 |
| `PUT` | `/api/users/:id` | ユーザー更新 |
| `DELETE` | `/api/users/:id` | ユーザー削除 |
| `GET` | `/api/departments` | 全部署取得 |
| `POST` | `/api/departments` | 部署作成 |
| `GET` | `/api/groups` | 全グループ取得 |
| `POST` | `/api/groups` | グループ作成 |
| `GET` | `/api/messages` | メッセージ取得（クエリ: `target_type`, `target_id`, `current_user_id`） |
| `POST` | `/api/messages` | メッセージ送信（スレッド返信時は `parent_id` 指定） |
| `POST` | `/api/messages/mark-read` | 既読フラグ更新 |
| `GET` | `/api/call-memos` | 全電話メモ取得（ステータス・日付降順） |
| `POST` | `/api/call-memos` | 電話メモ新規登録（チャットへの自動投稿通知も同時に実行） |
| `PUT` | `/api/call-memos/:id/status` | ステータス更新（未対応 ➜ 対応中 ➜ 完了） |
| `GET` | `/api/contacts` | 受電先台帳一覧 |
| `POST` | `/api/contacts` | 取引先登録 |
| `PUT` | `/api/contacts/:id` | 取引先更新 |
| `DELETE` | `/api/contacts/:id` | 取引先削除 |

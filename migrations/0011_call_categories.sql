-- 部門ごとに自由設定できる受電カテゴリ(例: 寝具リース課→貸布団/クリーニング/固定客注文/その他)。
-- call_type(緊急度の分類: 折り返し希望/緊急/伝達のみ)とは別軸の、業務内容の分類。
-- 任意項目(未選択でも登録できる)。department削除で連動削除、category削除時は既存メモのcategory_idをNULLに
-- (soft-delete usersの時と同じ理由: 過去データが外部キー制約で消せなくなるのを避けるため)。
CREATE TABLE call_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

ALTER TABLE call_memos ADD COLUMN category_id INTEGER REFERENCES call_categories(id) ON DELETE SET NULL;

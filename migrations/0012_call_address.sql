-- 受電先の住所（配送・現場対応が絡む業種向け、任意項目）
ALTER TABLE caller_contacts ADD COLUMN address TEXT;
ALTER TABLE call_memos ADD COLUMN address TEXT;

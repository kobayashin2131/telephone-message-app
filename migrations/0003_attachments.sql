-- チャットメッセージへのファイル添付（画像・PDF等）対応
ALTER TABLE messages ADD COLUMN attachment_url TEXT;
ALTER TABLE messages ADD COLUMN attachment_name TEXT;
ALTER TABLE messages ADD COLUMN attachment_type TEXT;
ALTER TABLE messages ADD COLUMN attachment_size INTEGER;

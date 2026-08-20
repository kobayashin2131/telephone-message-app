-- プラン別ストレージ容量の"器"。金額・プラン名は未確定だが、後で決めた時に
-- テーブル作り直しにならないよう、上限バイト数の列だけ先に用意しておく
-- （HOMEBASE側でプランと容量が後付けになった反省を踏まえて）。
ALTER TABLE organizations ADD COLUMN storage_limit_bytes INTEGER NOT NULL DEFAULT 1073741824; -- 1GB default
ALTER TABLE organizations ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'trial';

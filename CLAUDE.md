# CallSync (社内チャット ✕ 電話連絡DX統合SaaS) 指示書

このプロジェクトは、Google Chat（無料版）の置き換えと社内電話連絡DXを統合した、完全クローズドな社内コミュニケーションSaaSです。

## 技術スタック
- **フロントエンド**: React (Vite) + Lucide Icons + Modern CSS
- **バックエンド**: Cloudflare Workers (API) + Cloudflare D1 (SQLite) + (ローカル開発用 Express / node:sqlite)
- **ホスティング**: Cloudflare Pages (`https://callsync-app.pages.dev`)
- **データベース**: Cloudflare D1 `callsync-db` (ID: `2a03cb3a-3c27-4c48-9b42-2057e0a0da57`)

## 主要ディレクトリ構成
- `frontend/src/components/`:
  - `Sidebar.jsx`: サイドバー（モード切替・ユーザー切替・グループ/DM一覧）
  - `ChatArea.jsx`: チャットタイムライン（メッセージ送受信・既読確認・受電カード）
  - `DeskMonitorView.jsx`: 事務員ビュー（高速受電登録 ＋ 未対応リアルタイムモニター）
  - `MobileViewMode.jsx`: 現場ビュー（自分宛て受電一覧 ＋ ワンタップ対応完了）
  - `CallMemoCard.jsx`: 受電メモカード（ステータス変更・発信・スレッド）
  - `NewCallMemoModal.jsx`: 受電メモ登録モーダル（会社名サジェスト・宛先複数選択）
  - `NewGroupModal.jsx`: グループ作成モーダル（部門一括選択＋個別選択）
  - `ContactsDirectoryModal.jsx`: 受電先台帳（よくある発信元CRM）
  - `AdminModal.jsx`: 管理者メニュー（アカウント・部門管理）
  - `ThreadDrawer.jsx`: スレッド返信ドロワー
- `backend/worker.js`: Cloudflare Workers API バックエンド
- `schema.sql`: D1データベース スキーマ ＆ 初期シードデータ
- `wrangler.jsonc`: Cloudflare設定ファイル

## 開発・デプロイコマンド
- ローカル起動: `アプリ起動.bat`
- D1マイグレーション: `npx wrangler d1 execute callsync-db --remote --file=./schema.sql -y`
- Workerデプロイ: `npx wrangler deploy`
- Pagesデプロイ: `cd frontend && npm run build && npx wrangler pages deploy dist --project-name=callsync-app`

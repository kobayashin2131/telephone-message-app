# 🚀 Connect Suite (社内チャット ✕ 電話連絡DX CallSync)

## 📌 プロジェクト概要
**Connect Suite** は、中小企業や現場・オフィス向けに、**「社内チャット（Google Chatリプレイス）」** と **「電話連絡DX（CallSync / 紙の電話メモ全廃）」** を1つの共通アカウント基盤（SSO）でシームレスに行き来・相互連携できるB2B SaaSスイートアプリです。

- **本番Webアプリ (Cloudflare Pages)**: [https://callsync-app.pages.dev](https://callsync-app.pages.dev)
- **バックエンドAPI (Cloudflare Workers)**: `https://callsync-backend.nonba30.workers.dev/api`
- **クラウドDB (Cloudflare D1)**: `callsync-db`
- **リポジトリ**: `telephone-message-app` (OneDrive上: `C:\Users\nonba\OneDrive\telephone-message-app`)

---

## 🛠️ 技術スタック & アーキテクチャ
- **フロントエンド**: React 19 + Vite + Lucide Icons + モダンCSS
- **バックエンド**: Cloudflare Workers (TypeScript / JavaScript REST API) & ローカルExpress/SQLite
- **クラウドDB**: Cloudflare D1 (サーバーレス分散SQLite)
- **ホスティング**: Cloudflare Pages (自動エッジ配信)

---

## 📂 主要ディレクトリ・コード構成
```text
telephone-message-app/
├── CLAUDE.md                     # Claude Code向け引き継ぎ・開発ガイド（本ファイル）
├── PROJECT_CONTEXT.md            # プロジェクト詳細仕様・APIエンドポイント定義
├── schema.sql                    # Cloudflare D1 データベーススキーマ
├── backend/
│   ├── worker.js                 # Cloudflare Workers API エンドポイント (D1接続)
│   └── index.js                  # ローカル開発用 Express + SQLite サーバー
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # スイート統括メインコンポーネント (共通ステート・ルーティング)
│   │   ├── App.css               # スイート全体・チャット・CallSyncスタイリング
│   │   ├── main.jsx              # エントリーポイント
│   │   └── components/
│   │       ├── AppHeader.jsx     # 🌐 共通スイートヘッダー (アプリ切替・クイック受電登録・アカウント切替)
│   │       ├── ChatApp.jsx       # 💬 社内チャット専用アプリ (チャンネル・DM・スレッド)
│   │       ├── ChatArea.jsx      # 💬 チャットタイムライン・メッセージ入力・受電カードレンダリング
│   │       ├── ThreadDrawer.jsx  # 💬 メッセージ・受電メモへのぶら下がりスレッド会話
│   │       ├── CallSyncApp.jsx   # 📞 電話連絡DX専用アプリ (ボード・モニター・現場モバイル・台帳)
│   │       ├── CallMemoCard.jsx  # 📞 受電メモカード (未対応/対応中/完了ステータス操作・折返し発信)
│   │       ├── DeskMonitorView.jsx # 🖥️ 事務員デスクモニター (大型画面向け受電監視ボード)
│   │       ├── MobileViewMode.jsx  # 📱 現場モバイルビュー (ドライバー・外出営業向け簡易カード)
│   │       ├── ContactsDirectoryModal.jsx # 📇 受電先台帳・取引先名簿モーダル
│   │       ├── NewCallMemoModal.jsx # ➕ 受電メモ新規登録モーダル
│   │       ├── NewGroupModal.jsx   # 👥 新規グループ・チャンネル作成モーダル
│   │       └── AdminModal.jsx      # ⚙️ 組織・ユーザー・部署マスター管理モーダル
│   └── package.json
└── アプリ起動.bat                # ワンクリックローカル開発起動バッチ
```

---

## ✨ 実装完了済みの主要機能
1. **🌐 共通スイートヘッダー（`AppHeader.jsx`）**:
   - Google Workspace / Microsoft 365 形式のアプリ切り替えタブ（💬 社内チャット ⇄ 📞 電話連絡）。
   - どこからでも押せる「＋ 受電メモ登録」クイックボタン、受電先台帳、組織管理メニュー。
   - 共通アカウント（ユーザー・部署）の一元管理とワンクリック切り替え。
   - 未読メッセージ数・未対応受電件数のリアルタイムバッジ表示。

2. **💬 社内チャットアプリ（`ChatApp.jsx`）**:
   - 部署別チャンネル（#全体連絡, #営業部, #配送課など）と個人ダイレクトメッセージ（DM）。
   - テキストメッセージ、メンション、スレッド返信機能。
   - **電話メモカード連携**: CallSyncで電話が入ると、対象者のDMやチャンネルに「📞 受電メモカード」が流れてチャット上でも把握・ワンクリックでステータス変更が可能。

3. **📞 電話連絡DXアプリ（`CallSyncApp.jsx`）**:
   - **📋 ボード一覧**: 未対応・対応中・完了・自分宛てフィルター付きの受電カード一覧＆キーワード検索。
   - **🖥️ 事務員デスクモニター**: 事務所の大型モニターで全体の入電・対応状況を俯瞰できるマルチカラム画面。
   - **📱 現場モバイルビュー**: 外出先・スマホで直感的に確認・ワンタップで「折り返し完了」できるUI。
   - **📇 受電先台帳**: よくある相手先、電話番号、担当者リストを管理。

4. **☁️ Cloudflare D1 クラウド同期**:
   - 全データがクラウドDBにリアルタイム保存され、複数端末・複数ユーザー間で同期。

---

## 💻 開発・ビルド・デプロイコマンド
```bash
# フロントエンド開発ディレクトリへ移動
cd frontend

# ローカル開発サーバー起動 (http://localhost:5173)
npm run dev

# プロダクションビルド
npm run build

# Cloudflare Pages への本番デプロイ
npx wrangler pages deploy dist --project-name callsync-app
```

---

## 🔍 Claude Code にチェック・レビューしてほしい「別視点」の論点
1. **リアルタイム通知・着信音の強化**:
   - 受電メモが入った瞬間の音声通知（チャイム音）やブラウザPush通知（Service Worker）の実装。
2. **SaaS化・マルチテナント設計**:
   - 複数企業（テナント）が自社アカウントで利用できるようにするための `tenant_id` 分離と企業登録フロー。
3. **受電データの分析・レポート機能**:
   - 「誰宛てへの入電が多いか」「どの取引先からの入電が多いか」「平均対応時間」などを可視化する分析ダッシュボード。
4. **CTI（電話着信連携）や外部連携**:
   - クラウドPBX（Twilio, Zoom Phone等）との着信ポップアップ連携の可能性。

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
5. **🔔 着信音・Push通知（2026-08-18追加）**:
   - ヘッダーの🔔ボタンで、新しい受電メモが入った瞬間にチャイム音＋ブラウザ通知。
   - Service Worker + VAPID Web Push対応で、タブを閉じていても通知が届く（`frontend/public/sw.js`, `frontend/src/utils/push.js`, backend `/api/push/*`）。
6. **📱 モバイル対応（2026-08-18追加）**:
   - スマホ幅（〜640px）で社内チャットが「一覧⇄会話」を切り替える1カラム表示に。ヘッダーも圧縮される。

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

## ✅ 2026-08-18 セッションでの完了事項
Claude Codeによるコードレビュー＋大規模な不具合修正・デザイン刷新を実施済み。詳細はgit logを参照。
- **重大バグ修正**: ステータス文字列の不一致（未対応バッジが常に0件だった）／ボード画面のデータ変換漏れ（カードが空欄）／**4つのモーダル（受電メモ登録・新規グループ・台帳・組織管理）が`isOpen`プロパティ未接続で全て開かなかった**不具合
- 未使用の旧デザインコード（Dashboard/Sidebar/MobileView/HistoryView/MasterManagement.jsx, index.css）を削除
- デザイン刷新（親しみやすさ重視の方向、ティール×グリーン基調に統一）、未定義だったCSSクラスを約50個追加
- 🔔 着信音・ブラウザ内通知・Web Push（Service Worker）を実装
- 📱 スマホ表示の崩れを修正（試みたが未解決、下記参照）
- 本番（callsync-app.pages.dev / callsync-backend）へデプロイ済み

## ⚠️ 未解決：スマホ表示（最優先で確認すること）
2026-08-18〜19に2回、はみ出し（横スクロール）が起きるバグを見つけて直した（ヘッダー圧縮・チャット一覧⇄会話の1カラム化・デスクモニターのカード幅・スレッドパネルの全画面化）。修正のたびに `mcp__Claude_Browser__resize_window` で375x812に変えて `getBoundingClientRect()` で要素のはみ出しを機械的にチェックし、はみ出しはゼロになったことを確認して本番デプロイ済み。

**それでもオーナーが実機のスマホで見ると「まだだな…」とのこと。** この作業環境にはスクリーンショットを撮る手段がなく（`computer` の screenshot/zoom は毎回 "pane not displayed" で失敗する）、要素が画面に収まっているかどうかの機械的な確認しかできていない — つまり「詰まりすぎ」「文字が小さい」「タップしづらい」「要素の重なり」のような、はみ出し検知では拾えない見た目の悪さが残っている可能性が高い。

**次にこの作業をする人へ**: 憶測でCSSを触る前に、オーナーに実機のスクリーンショットを送ってもらうこと。「どの画面で」「具体的に何が変か」を聞くこと。それなしで直しても同じ堂々巡りになる可能性が高い。

## ✅ 2026-08-19 セッションでの完了事項
**Phase 1: マルチテナント化を実装・本番反映済み。**
- `migrations/0001_multi_tenant.sql`（追記のみ、DROP無し）を本番D1に適用: `organizations`テーブル新設＋主要6テーブル（users, departments, chat_groups, call_memos, caller_contacts, push_subscriptions）に`organization_id`列追加。既存データは全て`organization_id = 1`（デフォルト組織）に自動移行、データ損失なし
- `backend/worker.js`の全エンドポイントを組織スコープ対応に更新（`organization_id`はクエリパラメータ/リクエストボディから受け取り、未指定時はデフォルト1＝現行動作を維持。まだログインが無いためフロントエンドは変更していない）
- `schema.sql`（新規インストール用）も同じ構成に同期
- ローカルD1で検証してから本番D1・`callsync-backend`にデプロイ、本番APIで組織分離を確認済み
- **組織作成（サインアップ）フローは未実装**（Phase 1のスコープ外、合意通り）。新しい組織を増やす場合は今のところ手動でDBに`INSERT INTO organizations`する運用

**次にこの作業をする人へ**: Phase 2（ログイン機能）に進む前提が整いました。ログイン実装時に、認証後のセッションから`organization_id`を解決してAPIに渡す形に置き換えてください（今はクライアント自己申告＝誰でも偽装できる状態のままなのは意図的な暫定措置）。

## 🗓️ 次回作業予定（2026-08-19時点でオーナーと合意済み・PC03等どのPCでも継続可）

**合意した方針・順番**: マルチテナント化を先に実装 → その上にログイン機能を乗せる（逆順だとユーザーテーブルを作り直す手戻りが発生するため）。

**ログイン機能の要件（2026-08-19 最終決定・ハイブリッド構成）**:
- **「Googleでログイン」（OAuth）と「ID＋PIN」の両方に対応する。** 一度「PINは作らない」で合意しかけたが、オーナーが復活を要望したため確定。理由: 自社(約60名、Android中心)は全員Googleアカウントを持っているので困らないが、**将来他社に売ることを考えると、Googleアカウントを持たない・使いたくない利用者がいる会社は普通にあり得る**ため、ID+PINの選択肢も必須という判断（Google Sign-In自体はiPhone/Safariでも動作する点はオーナーに伝達済みだが、それとは別の「販売先の多様性」が本質的な理由）。
- ログイン画面には「Googleでログイン」ボタンと「ID・PINでログイン」フォームの両方を用意する
- ID+PIN側: `users.password` → `password_hash` に置き換え、PINレベルの短い数字でOK（ただしハッシュ化はする。CloudflareWorkersはbcrypt非対応なのでWeb CryptoのPBKDF2等を使う）。本人がPIN変更／管理者がリセットできるようにする
- Google側: Google OAuth（Authorization Code Flow、またはGoogle Identity ServicesのSign In With Googleボタン）→ 検証済みメールアドレスを受け取る → `users.email` と突き合わせて本人特定
- どちらの方式でログインしても同じ `users.email` に一致させ、同一人物として扱う
- ログインIDは既存の `email` 列をそのまま使う（Google/ID+PIN共通）
- 新エンドポイント: `POST /api/auth/google`（Google IDトークン検証）, `POST /api/auth/login`（email+PIN）, `POST /api/auth/change-pin`（本人用）, `POST /api/auth/reset-pin`（管理者専用）, `POST /api/auth/logout`
- 今の「ヘッダーのアカウント切替ドロップダウン」（誰でも他人になりすませる作り）は両ログイン方式併用のログイン/ログアウトに置き換える
- 各API呼び出しの `user_id`/`created_by` は現状クライアントが自己申告した値をそのまま信用しており誰でも偽装できる。ログイン後はサーバー側でセッショントークンから本人を特定する形に直す

**将来の収益化モデル（オーナー確定事項）**: 1社＝1テナント（完全にクローズドな環境）を売る形。購入した会社のオーナー（管理者）が最初のアカウントを作り、そこから社員を追加していく、標準的なB2B SaaSの広がり方。**Googleログインは他社に売るときもそのまま使える**（各社が既に持っているGoogleアカウントで完結する）。マルチテナント化とセットで、**ログインしてきたユーザーのメールアドレスのドメイン（@より後ろ）を見て、どのorganizationに属するかを自動判定する**仕組みにする（Slack等の「会社ドメインでワークスペースに参加」と同じ考え方）。

**オーナー確認済みの背景（プロダクト設計の参考に）**:
- 全社導入した場合の規模は約60名。Google Chat（無料版）からの脱却を考えた決め手は「グループ作成に承認が必要で、その通知が分かりにくく気づかれない→結局口頭で説明する羽目になる」「新規メンバーが検索に出てこないと相談されるが原因不明で時間を取られる」の2つ。有料版なら解決するかもしれないが予算の余裕がない。
- CallSyncは構造的にこの2つの問題が起きない（グループ作成に承認ステップがない／3秒ごとの全体再取得なので新規メンバーもすぐ検索に出る）ことは既にオーナーに伝達・確認済み。
- 他に導入しているツール: デスクネッツ（連携したいと言及あったが、優先度は低く「将来やりたいことリスト」扱いで合意）。
- **CallSyncは投機的な新規事業ではなく、まずオーナー自身の会社の実運用課題を解決するために作っている。** 実際の一号ユーザー・パイロット先はオーナーの会社そのもの。他社への販売は本当に使えるようになった後で考える、という優先順位。

### Phase 1: マルチテナント化
- `organizations` テーブル新設（id, name, created_at）
- 主要テーブル（users, departments, chat_groups, call_memos, caller_contacts, push_subscriptions）に `organization_id` 列を追加
- 既存データは `organization_id = 1` として扱う（後方互換の移行）
- `backend/worker.js` の全クエリに `WHERE organization_id = ?` を通す
- 組織作成（サインアップ）フローはこのPhaseのスコープに含めるか要相談。最初は手動でDBに組織を作る運用でも可

### Phase 2: ログイン機能（Google OAuth）
- Google Cloud ConsoleでOAuthクライアントID発行が必要（オーナー作業）
- `users.password` 列（現状 平文で `password123` 等が入っている）は不要になるので削除、または無視して放置
- セッション管理方式を決める（`sessions` テーブル方式 or 署名付きトークン方式）
- 新エンドポイント: `POST /api/auth/google`（GoogleのIDトークンを検証→メールアドレスでorganization内のuserと突き合わせ→セッショントークン発行）, `POST /api/auth/logout`
- 新規メンバーがGoogleでログインしてきたが `users` テーブルに未登録の場合の扱いを決める（自動作成 or 管理者の事前登録必須にするか）
- フロント: ログイン画面（Googleログインボタン）を新設。ヘッダーのアカウント切替ドロップダウンを廃止しログアウトボタンに置き換え
- 全fetchにセッショントークンを付与し、バックエンド側で `user_id` をトークンから解決する形に変更（今はクライアントの自己申告を丸ごと信用しており誰でも偽装できる）

### まだ手を付けていない他の論点（過去レビューより）
1. **受電データの分析・レポート機能**: 「誰宛てへの入電が多いか」「どの取引先からの入電が多いか」「平均対応時間」などを可視化する分析ダッシュボード。
2. **CTI（電話着信連携）や外部連携**: クラウドPBX（Twilio, Zoom Phone等）との着信ポップアップ連携の可能性。

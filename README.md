# WC2026 予想バトル — iPadだけで公開する手順

ターミナル不要。タップ操作だけで完結します。
全工程：**約15分**（GitHub 5分 + Firebase 5分 + Vercel 5分）

---

## STEP 1 — GitHubアカウントを作る（初回のみ）

1. Safariで https://github.com を開く
2. 「Sign up」→ メールアドレス・パスワード・ユーザー名を入力して登録

---

## STEP 2 — 新しいリポジトリを作る

1. 右上の「+」アイコン →「New repository」
2. Repository name: `wc2026-bet`
3. 「Public」を選択 →「Create repository」

---

## STEP 3 — ファイルをアップロードする

ZIPを解凍すると以下の構成です：

```
wc2026/
├── src/  (App.js, storage.js, index.js)
├── public/  (index.html, manifest.json)
├── package.json
├── .gitignore
└── README.md
```

**手順：**
1. リポジトリページで「Add file」→「Upload files」
2. 「ファイル」アプリから `src` フォルダの中身、`public` フォルダの中身、
   `package.json` `.gitignore` をまとめてドラッグ＆ドロップ
   （フォルダ構造は自動で保たれます）
3. 「Commit changes」

**確認：** リポジトリトップに `src` フォルダと `public` フォルダが見えていればOK

---

## STEP 4 — Firebaseを設定する（複数デバイス間のリアルタイム共有に必須）

これをやらないと「同じiPad内のタブ間」でしか同期しません。
友達と別々のスマホで使うには必須の設定です。**無料・コピペ中心・5分**

### 4-1. Firebaseプロジェクトを作る

1. Safariで https://console.firebase.google.com を開く
2. Googleアカウントでログイン（なければ作成）
3. 「プロジェクトを作成」→ プロジェクト名: `wc2026-bet` → 「続行」
4. Googleアナリティクスは「無効にする」でOK →「プロジェクトを作成」

### 4-2. Realtime Databaseを有効化

1. 左メニュー「構築」→「Realtime Database」
2. 「データベースを作成」
3. ロケーション：そのままでOK（または `asia-southeast1`）
4. セキュリティルール：「**テストモード**で開始」を選択 →「有効にする」

### 4-3. ルールを公開設定にする（賭けアプリなので読み書き自由に）

1. Realtime Database画面の「ルール」タブを開く
2. 表示されている内容を全部消して、以下を貼り付け：

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. 「公開」をタップ

### 4-4. Webアプリを登録して設定値をコピー

1. 左メニュー「プロジェクトの概要」の横の歯車アイコン →「プロジェクトの設定」
2. 下にスクロールして「アプリを追加」→ `</>`（ウェブ）のアイコンをタップ
3. アプリのニックネーム: `wc2026-web` → 「アプリを登録」
4. 表示される以下のようなコードをよく見る：

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "wc2026-bet-xxxx.firebaseapp.com",
  databaseURL: "https://wc2026-bet-xxxx-default-rtdb.firebaseio.com",
  projectId: "wc2026-bet-xxxx",
  storageBucket: "wc2026-bet-xxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

この**6つの値**を、次の手順でGitHub上のファイルに直接コピペします。

### 4-5. GitHub上でstorage.jsを直接編集

1. GitHubのリポジトリページで `src/storage.js` を開く
2. 右上の鉛筆アイコン（Edit this file）をタップ
3. 以下の部分を見つける：

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
```

4. `YOUR_xxx` の部分を、4-4でコピーした実際の値に **6箇所すべて** 置き換える
5. 下部の「Commit changes」をタップして保存

---

## STEP 5 — Vercelと連携してデプロイ

1. Safariで https://vercel.com を開く
2. 「Continue with GitHub」でログイン
3. 「Add New」→「Project」
4. `wc2026-bet` リポジトリを選択 →「Import」
5. 設定はそのまま（Framework Preset が「Create React App」になっているか確認）
6. 「Deploy」をタップ

2〜3分待つと
```
https://wc2026-bet-xxxx.vercel.app
```
のようなURLが発行されます。

---

## STEP 6 — 友達に共有する

発行されたURLをLINEなどでそのまま送るだけ。
全員がそのURLにアクセスし、名前登録→予想入力→結果確定がリアルタイムで全員に反映されます。

---

## 動作確認チェックリスト

- [ ] 自分のiPadでURLを開き、名前登録できる
- [ ] 別のスマホ（または別ブラウザ）で同じURLを開き、別の名前で登録できる
- [ ] 片方で予想・結果を入力 → もう片方の画面が数秒以内に更新される
- [ ] 「優勝」タブで優勝国予想とベット額が入力できる

すべてチェックできれば完成です。

---

## Firebase設定をあとから変更したい場合

GitHub上で `src/storage.js` を再度編集 → Commit するだけで、
Vercelは自動的に再ビルド・再デプロイされます（数分後に反映）。

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| Vercelで「Build failed」 | リポジトリ直下に `package.json` があるか確認（`wc2026/wc2026/...`の二重構造になっていないか） |
| 別デバイス間で同期しない | `src/storage.js` の `YOUR_API_KEY` が実際の値に置き換わっているか確認 |
| Firebaseで権限エラーが出る | Realtime Databaseの「ルール」タブで `.read:true, .write:true` になっているか確認 |
| デプロイ後、画面が真っ白 | Vercelの「Deployments」タブ→該当デプロイ→「View Function Logs」でエラー確認 |
| アップロードでフォルダが選べない | iPadの「ファイル」アプリでZIP解凍後、フォルダを長押しして「コピー」→ GitHubアップロード画面で「ペースト」 |

---

## 費用

完全無料（Firebase Sparkプラン・Vercel Hobbyプランどちらも無料枠で十分）

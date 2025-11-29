# Next.js AWS Amplify Template

AWS Amplifyにデプロイする準備ができたNext.jsプロジェクトのテンプレートです。

## 機能

- Next.js 16 (App Router)
- TypeScript サポート
- Tailwind CSS
- AWS Amplify デプロイメント設定
- 静的サイト生成 (SSG) 対応
- ESLint設定

## セットアップ

1. 依存関係をインストール:
```bash
npm install
```

2. 開発サーバーを起動:
```bash
npm run dev
```

3. ブラウザで `http://localhost:3000` を開く

## AWS Amplify デプロイメント

### 手順

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) にログイン
2. 「New app」→ 「Host web app」を選択
3. GitHubリポジトリを接続
4. ビルド設定は自動的に `amplify.yml` から読み込まれます
5. デプロイ開始

### ビルド設定

`amplify.yml` ファイルがビルド設定を定義しています。必要に応じてカスタマイズできます。

## 環境変数

環境変数を使用する場合は、`.env.example` をコピーして `.env.local` を作成し、適切な値を設定してください。

## プロジェクト構造

```
src/
├── app/
│   ├── layout.tsx       # ルートレイアウト
│   ├── page.tsx         # ホームページ
│   ├── about/
│   │   └── page.tsx     # Aboutページ
│   └── globals.css      # グローバルCSS
├── components/          # 再利用可能なコンポーネント
└── lib/                # ユーティリティ関数
```

## 開発コマンド

- `npm run dev` - 開発サーバー起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバー起動
- `npm run lint` - ESLintでコードチェック
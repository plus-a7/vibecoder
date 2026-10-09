# The perfect vibe coder. — Who is JSON?

**[ここから遊べる → https://vibe.oasobi.app/](https://vibe.oasobi.app/)**

AIにコードを書いてもらっていたら、英語の略語や用語で会話がかみ合わなくなる。そんな場面を3択で進める、短い会話ゲームです。ブラウザで遊べます。

## 遊び方

全10問。返答を選ぶと用語の説明と判定が表示されます。安全な返答で会話を続け、失敗したらリトライできます。キーボードでも操作できます。

アプリにログイン、課金、分析、バックエンド、外部通信はありません。生成したHTMLは単体で動作します。

## 開発・ビルド

Node.js 22以上とnpmが必要です。外部npm依存はありません。

```sh
npm test
npm run build
npm start
```

開発サーバーは `http://127.0.0.1:4173/`。停止は Ctrl+C。生成物は `dist/index.html` で、ブラウザで直接開くこともできます。

## ソースの構成

- `data/questions.json`: 日本語の会話、用語、解説、3択の問題データ。
- `src/game.mjs`: 問題の検証、シャッフル、状態遷移、回答IDの判定。
- `src/app.mjs`: 画面の描画、フォーカス、キーボード操作、ブラウザ履歴。
- `src/styles.css` / `src/index.html`: 画面の見た目とHTML。
- `scripts/build.mjs`: ソースを単一HTMLにまとめるビルド。
- `scripts/serve.mjs`: ローカル専用のHTTPサーバー。
- `test/`: Node標準のテストと小画面のQAページ。

問題は `id`, `dialogue`, `term`, `meaning`, `englishNote`, `replies` を持ちます。`replies` は一意なIDを持つ3件で、`text`, `isSafe`, `reason` を設定し、安全な返答は1件にします。

ローカルQAページは `http://127.0.0.1:4173/qa/mobile?width=320&font=200&theme=dark`。これは本番HTMLに含まれません。

## 公開範囲とライセンス

このリポジトリはゲームのソースとビルド・テスト手順を公開するものです。公開ライセンスは未選定で、MIT等のOSSライセンスは追加していません。

秘密情報、個人設定、ログ、認証ファイル、会話記録、検証用スクリーンショット、配備用アカウント設定、退避したiOS試作は含めていません。既存の公開サイト設定はこのリポジトリの公開準備で変更していません。

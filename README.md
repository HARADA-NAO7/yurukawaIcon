# Yurukawa Icon Maker

3キーワード + テーマ入力を、必ず「ゆるかわ動物アイコン」へ変換して生成する Next.js アプリです。

## 技術スタック

- Next.js (App Router) + TypeScript
- Tailwind CSS
- OpenAI API
- Supabase
- Vercel 配備想定

## セットアップ

1. 依存インストール

   npm install

2. 環境変数

   .env.example を .env.local にコピーして値を設定します。

3. 開発起動

   npm run dev

## Supabase テーブル

supabase/schema.sql を Supabase SQL Editor で実行してください。

## 現在実装済み

- 3キーワード入力
- 4テーマ選択（パステル / ネオン / ビビッド / モノクロ）
- 生成（OpenAIでプロンプト変換 -> 画像生成）
- 再生成（同入力で variation token を変えて別案）
- 保存（icons テーブルへ保存）
- 最新5件ギャラリー表示 + クリック拡大

## API

- POST /api/generate
- GET /api/icons
- POST /api/icons

## 補足

OPENAI_API_KEY 未設定時は、UI確認用のプレースホルダ画像を返します。

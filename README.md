# 御朱印帳 ✦

参拝で授かった御朱印を撮影して、スマホの中に一冊の御朱印帳として綴じていくアプリです。
パステルカラーとグラデーションの「Kawaii Future Bass」風デザインに、鳥居・しめ縄・桜といった神社のモチーフを添えています。

## 主な機能

- **御朱印帳の表示**：本のように左右のページをめくる「見開き」と、サムネイルを並べる「一覧」を切り替えられます
- **参拝の記録（3ステップ）**
  1. 神社を選ぶ（登録済みの神社から検索、または手入力で追加）
  2. 御朱印を撮影、または写真ライブラリから選ぶ（初穂料も入力可能）
  3. 参拝日・天気・同行者・おみくじ・メモを入力（任意）
- **御朱印の詳細**：参拝日、種類（通常・限定・書き置き）、初穂料などの確認と削除
- **端末内保存**：記録は SQLite、写真はアプリのドキュメントフォルダに保存します。外部サーバーには送信しません

## 技術スタック

- [Expo](https://expo.dev/) SDK 57 / React Native / TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/)（ファイルベースのルーティング）
- expo-sqlite、expo-file-system、expo-image-picker、expo-image-manipulator
- expo-linear-gradient、M PLUS Rounded 1c（`@expo-google-fonts/m-plus-rounded-1c`）

## 動かし方

### 必要なもの

- Node.js
- スマホに [Expo Go](https://expo.dev/go) アプリ（SDK 57 対応の最新版）

### 手順

```bash
git clone https://github.com/koheip/goshuin-app.git
cd goshuin-app
npm install
npx expo start
```

ターミナルに表示された QR コードを、iPhone ならカメラアプリ、Android なら Expo Go で読み取ると起動します。

- Expo Go に Expo アカウントでログインしている場合は、PC 側でも `npx expo login` で同じアカウントにログインしてください
- スマホと PC が同じ Wi-Fi につながらない環境では `npx expo start --tunnel` を使ってください

### 開発用コマンド

```bash
npx tsc --noEmit   # 型チェック
npx expo lint      # Lint
npm test           # テスト（Jest）
npx expo-doctor    # 依存関係と設定の診断
```

## ディレクトリ構成

```
src/
├── app/                 # 画面（Expo Router）
│   ├── (tabs)/          # タブ：御朱印帳・記録
│   ├── goshuin/[id].tsx # 御朱印の詳細
│   └── record/          # 参拝記録の3ステップ（モーダル）
├── components/          # 共通 UI（ボタン、見開きページ、神社モチーフなど）
├── db/                  # SQLite のマイグレーション・データ操作・型
├── lib/                 # 日付・画像の処理
├── record/              # 記録中の下書きの状態管理
└── theme.ts             # 配色・グラデーション・書体
```

デザインの色やグラデーションは [src/theme.ts](src/theme.ts)、鳥居・しめ縄・桜の部品は [src/components/shrine.tsx](src/components/shrine.tsx) にまとめています。

## ライセンス

[MIT License](LICENSE) © 2026 koheip

同梱して利用しているフォント「M PLUS Rounded 1c」は [SIL Open Font License 1.1](https://openfontlicense.org/) で提供されています。

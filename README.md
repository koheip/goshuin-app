# 御朱印帳 ✦

参拝で授かった御朱印を撮影して、スマホの中に一冊の御朱印帳として綴じていくアプリです。
パステルカラーとグラデーションの「Kawaii Future Bass」風デザインに、鳥居・しめ縄・桜といった神社のモチーフを添えています。神社だけでなく、お寺の御朱印も記録できます。

## 主な機能

- **御朱印帳の表示**：本のように左右のページをめくる「見開き」と、サムネイルを並べる「一覧」を切り替えられます
- **御朱印帳を複数冊**：帳がいっぱいになったら次の帳を始められます。帳の名前の変更と、御朱印の並べ替えもできます
- **参拝の記録（3ステップ）**
  1. 神社・お寺を選ぶ（登録済みから検索、または手入力で追加。今いる場所も記録できます）
  2. 御朱印を撮影、または写真ライブラリから選ぶ（初穂料・納経料も入力可能）
  3. 参拝日・天気・同行者・おみくじ・メモを入力（任意）
- **御朱印の詳細**：参拝日、種類（通常・限定・書き置き）、初穂料などの確認・編集・削除と、Google マップで開く
- **地図**：位置を記録した神社・お寺を地図に並べます（アプリ内の地図は開発ビルドのみ。Expo Go では一覧から Google マップで開きます）
- **バックアップ**：記録と写真を1つのファイルに書き出し、機種変更後などに戻せます
- **端末内保存**：記録は SQLite、写真はアプリのドキュメントフォルダに保存します。外部サーバーには送信しません

## 技術スタック

- [Expo](https://expo.dev/) SDK 57 / React Native / TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/)（ファイルベースのルーティング）
- expo-sqlite、expo-file-system、expo-image-picker、expo-image-manipulator
- expo-location、expo-maps、expo-sharing、expo-document-picker
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
npm run start:go
```

ターミナルに表示された QR コードを、iPhone ならカメラアプリ、Android なら Expo Go で読み取ると起動します。

- Expo Go に Expo アカウントでログインしている場合は、PC 側でも `npx expo login` で同じアカウントにログインしてください
- スマホと PC が同じ Wi-Fi につながらない環境では `npx expo start --go --tunnel` を使ってください
- `expo-dev-client` を入れているため、`npx expo start` だけだと開発ビルド向けに起動します。Expo Go で開くときは `--go` を付けてください

### 開発ビルド（アプリ内の地図を使うとき）

アプリ内の地図（expo-maps）は Expo Go に入っていないため、開発ビルドが必要です。

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform ios   # または android
npx expo start                                                   # 開発ビルドのアプリで開く
```

Android の地図には Google Maps SDK for Android の APIキーが必要です。環境変数 `GOOGLE_MAPS_ANDROID_API_KEY` に入れると [app.config.ts](app.config.ts) が設定に加えます（EAS では Environment variables に登録）。

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
│   ├── (tabs)/          # タブ：御朱印帳・地図・記録
│   ├── books/           # 御朱印帳の一覧・名前と並び順
│   ├── goshuin/         # 御朱印の詳細・編集
│   ├── backup.tsx       # バックアップ
│   └── record/          # 参拝記録の3ステップ（モーダル）
├── components/          # 共通 UI（ボタン、見開きページ、神社モチーフなど）
├── db/                  # SQLite のマイグレーション・データ操作・型
├── lib/                 # 日付・画像・地図・位置情報・バックアップの処理
├── record/              # 記録中の下書きの状態管理
├── testing/             # テスト用の補助（Node の SQLite で DB を再現）
└── theme.ts             # 配色・グラデーション・書体
```

デザインの色やグラデーションは [src/theme.ts](src/theme.ts)、鳥居・お堂・しめ縄・桜の部品は [src/components/shrine.tsx](src/components/shrine.tsx) にまとめています。

## ライセンス

[MIT License](LICENSE) © 2026 koheip

同梱して利用しているフォント「M PLUS Rounded 1c」は [SIL Open Font License 1.1](https://openfontlicense.org/) で提供されています。

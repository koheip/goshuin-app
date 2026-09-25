# やることリスト

コードで実装できるものは実装済み。残りは、実機での確認と、アカウントやキーの設定など手元での作業。

おすすめの順番：1 → 2 → 3 → 4 → 5

## 🔴 実機で確認する

- [ ] **1. Expo Go で見た目と動きを確認する**（`npm run start:go`）
  - [ ] 配色・鳥居・お堂・しめ縄・桜が読みやすいか
  - [ ] ホームの見出し：帳の名前のボタンとバックアップボタンで窮屈になっていないか
  - [ ] 御朱印帳：次の帳を始める、帳を切り替える、名前を変える、並べ替える
  - [ ] お寺：追加時に「お寺」を選ぶとお堂の絵になり、「納経料」と表示されるか
  - [ ] 位置：「今いる場所を記録」で許可を求められ、地図タブの一覧に並ぶか
  - [ ] 詳細：「地図で見る」「記録を編集」
  - [ ] バックアップ：書き出して、そのファイルから戻せるか
  - [ ] 既存のデータ：更新前に記録した御朱印の並び順が変わっていないか（DB の版2への移行）

## 🟡 決めること・アカウントの設定

- [ ] **2. ストア用の識別子を確定する**：今は仮に `com.koheip.goshuin`（[app.json](app.json) と [src/lib/places.ts](src/lib/places.ts)）。ストアに出したあとは変えられない
- [ ] **3. 開発ビルドを作る**：アプリ内の地図（expo-maps）は Expo Go では動かない
  - [ ] `npx eas-cli@latest login` で Expo にログインし、`npx eas-cli@latest init` でプロジェクトをつなぐ
  - [ ] `npx eas-cli@latest build --profile development --platform ios`（または android）
  - [ ] 開発ビルドのアプリで `npx expo start` を開き、地図タブにピンが出るか確認する
- [ ] **4. Google Cloud の APIキーを用意する**（[.env.example](.env.example) を `.env` にコピーして入れる）
  - [ ] 課金を設定し、予算アラートを入れる
  - [ ] 「Google で探す」用：Places API (New) を有効にしたキーを作り、`EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` に入れる。API は Places API (New) だけに、アプリは iOS の Bundle ID / Android のパッケージ名と SHA-1 に制限する
  - [ ] Android の地図用：Maps SDK for Android を有効にしたキーを作り、`GOOGLE_MAPS_ANDROID_API_KEY` に入れる（EAS では Environment variables に登録）。開発ビルドの SHA-1 で制限する
- [ ] **5. プライバシーポリシーを公開する**：[PRIVACY.md](PRIVACY.md) を GitHub Pages などで公開し、URL をストアの申請に使う

## 🟢 公開

- [ ] **6. ストア用のビルドと申請**：`eas build --profile production`、`eas submit`。スクリーンショットと説明文を用意する

## ⚪ 気にしておくこと

- **バックアップの大きさ**：写真を base64 で1つの JSON に入れている。写真が数百枚になると書き出し・読み込みが重くなるので、その頃に分けて保存する方式を検討する
- **expo-maps はアルファ版**：SDK の更新で API が変わりやすい。更新時は [src/components/PlacesMap.tsx](src/components/PlacesMap.tsx) を確認する
- **Places API の X-Android-Cert**：Android でキーをアプリに制限する場合、署名の SHA-1 をヘッダーで送る必要がある。制限をかけたら [src/lib/places.ts](src/lib/places.ts) に追加する

## ✅ 完了

- [x] 検索欄の色の変更漏れを直す
- [x] データのバックアップ機能を作る（ホーム右上 → バックアップ）
- [x] 記録を編集できるようにする
- [x] 「地図で見る」ボタン（APIキー不要）
- [x] 御朱印帳を複数冊にする（ホームの帳の名前 → 一覧）
- [x] 御朱印を並べ替える（帳の一覧 → … → 並び順）
- [x] お寺にも対応する（お堂のモチーフ、納経料）
- [x] Google で神社・お寺を検索して登録（APIキーを入れると表示）
- [x] アプリ内に地図を表示（地図タブ。開発ビルドで地図、Expo Go では一覧）
- [x] 今いる場所を神社・お寺の位置として記録する
- [x] アプリのアイコンとスプラッシュ画像を作る（[scripts/make-icons.py](scripts/make-icons.py)）
- [x] ストア用の識別子を設定する（仮の値。2 で確定する）
- [x] EAS の設定（[eas.json](eas.json)）と開発ビルドの準備（expo-dev-client）
- [x] プライバシーポリシーを書く（[PRIVACY.md](PRIVACY.md)）
- [x] 使っていないフォントのパッケージを削除する
- [x] 手元のブランチ名を `main` にする
- [x] テストを追加する（`npm test`：日付・地図URL・Google 検索の変換・データベースの操作）
- [x] codex 用の作業フォルダを片付ける

# 01開発の引き継ぎ（2026-10-23）

## 再開する場所

- GitHub: `RyutanCAMP/darts-training-lab`
- 引き継ぎブランチ: `feat/zero-one-handoff-20261023`
- 基準コミット: `f025f97f1ffbf67f74bbe9d7684a2edb44883343`（`refactor/split-app-modules`）。未マージのソース分割を含むため、mainにこの差分だけを移植しないこと。
- 現在のアプリ表示バージョンは `v0.8.0-beta.1`。`v0.7.0-beta.2`の対戦・アカウント選択に、その後の横向きレイアウト変更を含む。
- 最初にこの文書、`CLAUDE.md`、`README.md`を読む。`docs/zero-one-preparation.md`は実装前の設計記録であり、現状の仕様ではない。

## 実装済み

- 1人用01: 301 / 501 / 701、ストレートイン、オープンアウト、ブル50点、20ラウンド。バースト、取り消し、途中再開、履歴、バックアップ。
- 1台で交代するオフライン2人対戦。P1先攻。3投またはバースト後に交代確認。先に0で勝利、双方20ラウンド終了なら引き分け。
- 名前の初期値は「プレーヤー1」「プレーヤー2」。現在ログイン中のアカウントを片方に割り当て、もう片方はゲスト。2人同時ログインや他ユーザー検索は行わない。
- 対戦の残点・名前・投球所有者・交代待ちを端末に保存。2人対戦はクラウド同期およびCOUNT-UP分析の対象外。
- 残り投数に応じた上がり候補。残点カード右上に小さく表示し、矢印を使わず組み合わせで表示する。
- DARTSLIVE HOMEを参考にした横向き中心の画面: 中央にボード、左にラウンド、右に3投と交代操作、下部にP1/P2の残点。P1は赤系、P2は青系。直近3ラウンドと全ラウンド表示の切替。縦向きにも対応。

## 主なファイル

- `game/zero-one.js`: 01判定、対戦リプレイ、検証、操作の振り分け。
- `ui/zero-one.js`: 01・対戦の表示。`ui/match-accounts.js`: アカウント割当。
- `ui/render.js`、`ui/events.js`、`styles.css`: 横向き画面、折りたたみ、表示更新。
- `app.js`: connector登録と初期化順序。機能の登録は初期化より先に行う。
- `preview.html`: 単独配布用。ソース変更後は必ず `python tools/sync-preview.py` で同期する。

## 次の作業

1. 横向きレイアウトをユーザーと確認し、見た目を仕上げる。ユーザーから具体的な追加変更はまだ指定されていない。
2. 200S実機、iPhone Safari実機、実Google認証・Firestore同期を確認する。自動テストは疑似入力・fake認証を使う。
3. ユーザーの指示を受けて次の機能を選ぶ。ダブルアウト、上がり練習、01専用分析は案の段階で未実装。

## 開発と公開

```sh
python -m pip install playwright
python -m playwright install chromium
python tools/serve-preview.py
python -X utf8 tools/run-tests.py
python tools/sync-preview.py --check
git diff --check
```

- テストは合成データを使用し、ユーザーのブラウザ保存データを操作しない。テスト生成物、仮想環境、`debug.log`、個人練習記録はコミットしない。
- このブランチはAI間の作業引き継ぎ用。mainへのマージや本番公開は実施していない。
- 現在のActionsはmainへのpushで本番公開、PRでは条件によりFirebaseプレビューを公開する。公開の意図を確認してからPRやデプロイを行う。
- この環境では元の作業フォルダーのGit管理領域を書き換えられず、GitHub接続機能でコミットを作成した。別AIはGitHubの上記ブランチから取得して始めること。元フォルダーの未コミット差分を重ねて適用しない。

## 今回の検証

- 2026-10-23: 全14テストファイルが通過。最初の一括実行は復旧テストの設定ボタン選択が2個に一致して停止したため、`test_recovery_safety.py`のクリック先をヘッダーの`.settings-icon`に限定して再実行し通過。残り4ファイル（regression / report / result_focus / zero_one）も個別に実行して全て`ALL PASS`を確認した。
- 一括実行時のWindows標準出力がcp932でエラー詳細を表示できなかった。UTF-8で再実行して原因を確認した。Windowsでも上記の `python -X utf8 tools/run-tests.py` を使う。
- `python tools/sync-preview.py --check`、`git diff --check`が通過。
- 画面テストは通常版・単独preview、1280×800 / 1024×768 / 844×390 / 667×375 / 640×360 / 390×844。ボードのタッチ入力、交代、取り消し、残点・上がり候補、全ラウンド表示、画面回転、設定への移動を確認。1280×800のスクリーンショットも目視確認した。
- 実200S、iPhone Safari実機、実Google認証・Firestore同期は未確認。個人データやローカルのテスト生成物は含めない。

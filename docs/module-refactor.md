# RETRO DARTS ソース分割の作業報告

作業日: 2026-10-20（日本時間）

## 基準と作業範囲

- GitHub: `RyutanCAMP/darts-training-lab`
- 作業開始時: `main`、未コミット変更なし。
- `git fetch origin main` 後、ローカルmainとorigin/mainはどちらも `73a9a2d251924eed6b8c3628e0190db065bfd531`。
- 専用ブランチ: `refactor/split-app-modules`。
- 分割前のファイルはGit上の基準コミットと、Git対象外の `.test-artifacts/` に保持。
- 分割作業時点ではmainの変更・マージ、リモートへのpush、Firebase Hosting／GitHub Pagesへのデプロイは行っていない。第三者レビュー用の保存では、専用ブランチへのコミット・pushとDraft PR作成のみを行う。
- 新機能、ゲームルール、HTMLの画面構造、CSS、保存キー・スキーマ、Firebase設定・ルールは変更していない。レビュー用保存に際し、GitHub Actionsのpreviewジョブはこの作業ブランチを除外する条件を追加し、PR作成によるHostingへの自動反映を防ぐ。

## 分割前と分割後

分割前:

```text
index.html → styles.css + app.js（144,265 bytes）
preview.html（CSS・app.jsを埋め込んだ単独版）
data/、assets/、tools/
```

分割後:

```text
index.html → styles.css + 下記23ファイル + app.js（2,769 bytes）
app.js                  接続・初期化の入口
core/state.js
game/{rules,countup,rounds}.js
board/{board,input}.js
audio/{sound,effects}.js
storage/{local,backup,rounds,cloud}.js
analysis/{overview,aim,period,advanced,report}.js
ui/{navigation,render,events,help,my-darts,catalog}.js
preview.html            同じ全ソースを埋め込んだ単独版
data/、assets/           変更なし
tools/                  プレビュー同期・ローカル配信・テスト
```

## 各ファイルの役割

| ファイル | 主な責務 |
|---|---|
| `app.js` | 内部コンテキスト生成、全機能の接続、元の順序による状態復元・イベント登録・初期描画 |
| `core/state.js` | 共有状態・DOM取得・ボード数字配列の初期値 |
| `game/rules.js` | セッション生成、現行得点計算、ラベル、BULL／狙い判定、集計の基本ヘルパー |
| `game/countup.js` | 投球追加、24投の進行、完走保存、途中終了、新ゲーム、undo、結果確定 |
| `game/rounds.js` | 投球／ラウンドの称号判定、ラウンド間クールダウンとその描画 |
| `board/board.js` | SVGボード生成、クリック／Enter入力、着弾の点滅 |
| `board/input.js` | 200S既定マップ、START／CHANGE、重複入力防止、キー割当、キャリブレーション、信号記録 |
| `audio/sound.js` | Web Audio合成、クールダウン音源、BGM、音量、音声テスト |
| `audio/effects.js` | ピクセル演出、BULL／HAT TRICK等の表示、起動演出 |
| `storage/local.js` | localStorageの読込・保存、異常データ保護、復旧履歴、保存表示、ID生成 |
| `storage/backup.js` | JSON／CSV出力、JSON復元・入力検証、設定復元、履歴削除 |
| `storage/rounds.js` | ラウンド一覧、分析対象からの除外と保存 |
| `storage/cloud.js` | Firebaseの遅延読込、Google認証、同期状態、セッション／プロフィールのマージ・送受信 |
| `analysis/overview.js` | 投球順のBULLバー、スコア推移、基本指標 |
| `analysis/aim.js` | セグメントによる推定位置、ヒートマップ、狙い中心 |
| `analysis/period.js` | 分析対象期間・狙いの選択、分析の接続・更新、表示文言 |
| `analysis/advanced.js` | 詳細統計、投球順、偏り、連続記録、目標、練習ログ、インサイト |
| `analysis/report.js` | 既存ルールによるCOACH REPORT、タイピング表示、コピー |
| `ui/navigation.js` | タブ移動、トースト |
| `ui/render.js` | PLAY／結果／履歴／設定の描画、結果比較 |
| `ui/events.js` | ゲーム・設定・音量・画面移動の操作接続 |
| `ui/help.js` | HELP文言、カード説明、分析グループ、開閉処理 |
| `ui/my-darts.js` | MY DARTSの読込・保護・保存、登録・編集・切替、シート操作 |
| `ui/catalog.js` | 既存カタログの取得、検証、検索、選択 |

### 接続と読み込み

通常のVanilla JavaScriptスクリプトを `defer` で順に読み込む。`index.html` がファイル順序を明示し、最後に `app.js` を実行する。新しいフレームワーク、ビルドツール、アプリの依存パッケージは追加していない。

各ファイルはstrictなIIFE内にconnectorを持つ。読み込み中だけ `RETRO_DARTS_MODULES` にconnectorを登録し、入口で取り出した直後にこの名前空間を削除する。実際のゲーム状態・関数群を持つ `runtime` は入口の閉じたスコープ内にあり、windowには公開しない。

先に全connectorを接続して関数を登録し、その後で状態初期化とイベント登録を元の順序で実行する。別機能への呼び出しや共有状態の参照だけを `runtime.xxx` に置き換え、同じ機能だけで使う変数・関数はconnector内に保持した。機能間で直接ファイルを読み込む処理はなく、ファイル間の循環読み込みもない。内部コンテキストは相互コールバックを接続するための契約であり、各機能が完全に独立したわけではない。

`tools/sync-preview.py` はindexの順序で各ソースをそのまま連結し、CSS・HTMLとともにpreviewへ埋め込む。通常版・previewとも `file://` で動く構成を維持した。カタログの外部取得やFirebaseの利用条件は従来のまま。

## 変更・追加ファイル

- 変更: `app.js`、`index.html`、`preview.html`、`.gitignore`、`README.md`、`CLAUDE.md`。
- 追加: 上表の `core/`～`ui/` の23ファイル。
- 変更: `tools/sync-preview.py`、`tools/run-tests.py`、`tools/README.md`。
- テスト補修: `tools/tests/test_help.py`、`test_report.py`、`test_regression.py`、`test_recovery_safety.py`。
- 追加: `tools/tests/test_module_split.py`、`tools/serve-preview.py`、この報告書。
- レビュー用保存時の追加変更: `.github/workflows/deploy.yml`（この作業ブランチのPRではHosting previewを実行しない）。

テスト補修は、分割で増えたリクエストを受けるHTTPサーバーの並列化・待受キュー拡張、元から閉じていた分析グループを開く操作、無条件成功だった履歴確認の実チェック化。テストの期待するアプリ仕様を緩めていない。テストランナーはWindowsでも子プロセス出力をUTF-8で扱う。

## 実施した検証

### 分割前との比較

- 元のソースだけをコピーした環境で既存9テストを実行。8本は通過、`test_regression.py` は折りたたまれた期間ボタンをクリックできず停止した。アプリを変更せず、テストで分析グループを開くように補修した。
- 一時的な構文解析ツールで、元の148関数と196件の順序付き初期化・副作用を比較。共有参照の修飾と宣言の段階化を正規化した後の構文木は一致。処理や保存形式を書き換えていないことを確認した。この比較は実行環境を含む完全な動作同値の証明ではない。
- 同じデータ・日時でPC幅1280px／モバイル幅390pxのPLAY・分析・履歴・セット・設定を撮影。計10組のPNGがバイト単位で一致した。モバイルPLAY画面は画像を開いて確認した。
- JavaScript全24ファイルの `node --check`、`sync-preview.py --check`、`git diff --check` が通過。

### ブラウザ検証の内容

最終結果: `tools/run-tests.py` は終了コード0。既存9本＋新規1本の全10テストとpreview同期チェックが通過した。単独HTMLの既存配布ツール2種類も実行できた。

- 既存テスト: 狙い別分析・旧データ、カタログ、クラウドの疑似同期、HELP、MY DARTS、破損データ保護・復旧、COUNT-UP総合、レポート、結果比較。
- 新規の横断テスト: 通常版HTTP／単独previewのfile起動 × PC／モバイルの4条件。
- 画面上のボード中心への実際のマウスクリック／タッチ入力、82領域の存在、BULL点滅、横はみ出しの確認。
- OB・IB・D20・T20・MISS・内側S20を含む24投、現行得点合計880点、全7回のラウンド切替、待機中の追加入力抑止、undo、最後の1投修正、結果保存、再読込、履歴24行。
- HAT TRICK表示、演出中の入力抑止、演出後のクールダウン、途中終了、新ゲーム。
- JSONバックアップのダウンロード、別ブラウザコンテキストへの復元、保存済みセッションの一致。
- 200S既定キーの疑似入力によるS20／OB／IB得点、入力元・zoneの記録、START／CHANGE処理。
- 未割当キーのキャリブレーション登録・保存・停止。
- Web Audio音源の再生開始、音量37%の保存・再読込、効果音OFFの保存。音が実際に聞こえるかは確認していない。
- 一時登録用名前空間とruntimeがwindowに残らないこと。

検証ログ・画像はGit対象外の `.test-artifacts/` に置いた。最終の統合実行結果は同フォルダの `final-tests.txt`。テスト用のデータとブラウザコンテキストを使用しており、ユーザーの実データには触れていない。

## 未確認項目・残るリスク

- DARTSLIVE 200S実機のBluetooth接続、物理投球・START／CHANGE、全82領域の実機キャリブレーション。
- iPhone Safari／Android実機でのタッチ・画面・音声・消音設定。モバイル確認はChromiumの画面幅／タッチ相当。
- 実際のGoogleログイン、Firebase SDK取得、Firestore権限・本物のクラウドとの送受信。既存のメモリ上のfakeを使う同期テストのみ実施し、本番データへアクセスしていない。
- 効果音・BGMの実聴、端末やブラウザごとの音声自動再生制限。
- LANの別端末からの到達性は未確認。Windowsのファイアウォールやネットワーク分離に依存する。
- 通常版は複数JSを配信するため、今後反映するときはフォルダごと全ファイルを揃える必要がある。単独HTMLが必要な場合はpreviewを利用する。
- 共有状態・既存のCOUNT-UP前提は維持している。今回の分割だけで任意のゲームをそのまま差し込める完成形にはしていない。

## 将来01ゲームを追加する場合

| 対象 | 将来必要な検討（今回は未実装） |
|---|---|
| `game/` | 01専用の状態・開始点・減算・バースト・終了判定を別ファイルで追加。現行 `rules.js` の得点、`countup.js` の24投前提、`rounds.js` の切替との接続を整理 |
| `app.js` | ゲームごとの接続と初期化を選択 |
| `ui/render.js`、`ui/events.js`、`index.html` | ゲーム選択、残点、終了表示・操作の接続。既存COUNT-UP表示との互換性を保つ |
| `board/board.js`、`board/input.js` | ボードから現在のゲームへ入力する接続。表示・キー割当自体は再利用候補 |
| `storage/backup.js`、`storage/cloud.js`、`game/rules.js` | `gameType` ごとの検証・復元・同期。現在の `validDart`／`validSession` は8ラウンド・24投を前提としているため要対応 |
| `analysis/` | 01とCOUNT-UPをゲーム種別で分ける。COUNT-UPの完走平均・ベスト・既存履歴を変えない |
| `audio/`、`ui/help.js` | 新ゲーム特有の演出・説明が必要なら追加 |
| `tools/tests/`、`preview.html` | 現行COUNT-UP回帰テストを維持し、01の専用テスト追加後にpreviewを再生成 |

保存互換性を保つため、01の追加時も旧 `gameType:'countup'` と既存localStorageをそのまま読める設計が必要。

## 確認用URLと再起動方法

- PC: <http://127.0.0.1:8765/index.html>
- 同じLANのスマートフォン: サーバー起動時に表示されるLAN URLの `preview.html` を開く（端末固有のIPは公開資料に記載しない）。
- 単独ファイル: ルートの `preview.html` を端末へコピーして開く。
- ローカルのindex／previewはHTTP 200を確認済み。LANでの実端末確認は未実施。
- サーバー再起動: `python tools/serve-preview.py --lan`（この環境では `.venv/Scripts/python.exe` も利用可能）。PCの稼働と同じネットワークへの接続が必要。IPが変わった場合は起動時に表示されるURLを使う。
- 公開URLは発行していない。外部サービスへアップロードせず、ローカルとLAN向けの確認環境を用意した。

第三者レビュー用の変更は `refactor/split-app-modules` ブランチへ保存する。mainへのマージとデプロイは行わない。

ソース変更後は `python tools/sync-preview.py`、検証は `python tools/run-tests.py`。PlaywrightとChromiumが必要だが、アプリの実行には不要。

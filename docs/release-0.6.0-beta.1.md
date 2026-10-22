# v0.6.0-beta.1 — 01 practice

## Added

- PLAYのGAMEからCOUNT-UP / 301 / 501 / 701を選択できる。
- 1人用01。ストレートイン、オープンアウト、OB/IBとも50点、上限20ラウンド。
- 残点ちょうど0で即終了。超過した投球でバーストし、ラウンド開始時の残点へ戻して次ラウンドへ移る。残り1は有効。
- 実際に投げた分だけ記録し、バースト後の未投球をMISSで埋めない。バースト投球・上がり投球も取り消せる。
- 途中の自動保存・再読込からの再開、途中終了、結果の確定、履歴詳細、バックアップ、CSV、クラウド送受信。
- 最終ラウンドでの0到達を優先し、届かなければROUND LIMITとして残点を保存する。

## Data compatibility

- 既存の保存キー`dtl-data-v1`とCOUNT-UPの保存形式を維持。
- 01は`gameType: 'zero-one'`と固定ルール`rules`を追加。COUNT-UPは従来の`countup`、種別なしの旧記録もCOUNT-UPとして扱う。
- 投球の`score`は着弾得点で、バーストを含めた有効減点・残点は投球列から再計算する。投順はroundIndex/dartIndexを使う。
- completedはゲームが終了した記録。01は`result.reason`でcheckout / round-limitを区別する。abandonedは途中終了。
- JSONの履歴取込・クラウドの送受信で01のルール・投順・得点・終了条件を検証する。結果キャッシュも再計算と照合する。
- JSON復元は履歴を統合する。activeの書出しは従来どおり行うが、別端末への進行中ゲームの復元は対象外。
- CSVは既存列の末尾にgame_type / start_scoreを追加。
- 分析、ベスト、平均、実績、練習ログ、コーチレポートはCOUNT-UPのみに限定。01の統計・PPD・公式レーティングは追加していない。
- 旧版アプリでは01の読込・集計・削除が正しく扱われるとは限らない。複数端末で使う場合は同じ版へ更新する。

## Implementation

- `game/zero-one.js`: DOM非依存の投球列再生と検証、および既存COUNT-UP操作への振り分け。新規セッション作成は`game/rules.js`。
- `ui/zero-one.js`: 残点、20ラウンド、実投ログ、結果表示。
- `board/input.js`: 200SのSTARTで結果確定、CHANGEでラウンド待機をスキップ。24投固定の終了条件をゲーム別判定に変更。
- 結果保存失敗時は進行中ゲーム・履歴・選択ゲームを元へ戻し、再試行できる。
- ソースと単独previewを同期。Firebaseの設定・公開先・権限ルールは変更しない。

## Verification

- 2026-10-22: `tools/run-tests.py`は終了コード0。既存11本＋01追加1本の全12テストとpreview同期チェックが通過。全JavaScriptの構文チェック、`git diff --check`も通過。
- PC/モバイル幅の画面を撮影し、モバイル画面を目視確認。確認用サーバー`http://127.0.0.1:8765/index.html`から新バージョンがHTTP 200で取得できることを確認。
- `tools/tests/test_zero_one.py`: エンジンの境界値と不正記録の拒否、通常版HTTP/単独preview × PC/モバイル相当、手入力・疑似200S、再開、undo、結果確定、上限終了、バックアップ復元、混在分析、疑似クラウド送受信、保存失敗後の再試行。
- 既存COUNT-UPの回帰テストも含めて`python tools/run-tests.py`で実行する。
- 実機200S、iPhone Safariの音声・Bluetooth、実際のGoogleログイン・Firestore接続は未確認。自動テストのクラウドはメモリ上のfake。
- この版の公開・デプロイは別作業。

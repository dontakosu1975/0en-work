# 0EN WORK

「求人掲載 0円・応募 0円・採用 0円」を目指す求人サービス、0EN WORKの開発リポジトリです。

現在はサービスの開発中で、Coming Soonの仮LPのみを公開しています。求人掲載・応募などの機能はまだ実装していません。

## 現在の構成

- `index.html`: 日本語の仮LP。HTMLとインラインCSSで構成しています。
- `README.md`: 開発・公開・更新の手順。
- `README.txt`: 初期の手動アップロード手順。
- `.gitignore`: ローカル設定や一時ファイルの除外設定。

フレームワーク、外部パッケージ、ビルド処理は使用していません。

## ローカルでの確認

`index.html` をブラウザーで開いて確認できます。PCとスマートフォンの画面幅で、見出しや3つの「0円」の表示を確認してください。

## Cloudflareでの公開

公開先ドメインは `0en.work` です。GitHubのチェックに `Workers Builds: 0en-work` が表示され、`main` へのpushでCloudflare Workersの自動ビルドが開始されることを確認しました。

| 項目 | 確認内容 |
|---|---|
| Gitリポジトリ | `dontakosu1975/0en-work` |
| 更新ブランチ | `main` |
| 自動ビルド | `Workers Builds: 0en-work` |
| 公開ファイル | リポジトリ直下の `index.html` |

HTML自体のビルド処理はありません。Cloudflare側のBuild command、Deploy command、静的アセットのディレクトリ指定は管理画面で確認してください。このリポジトリには、現在Wrangler設定ファイルやpackage.jsonはありません。

初期の `README.txt` は手動アップロードの案内です。現在のGit連携による自動更新の確認には、Cloudflare Workersの対象プロジェクトのビルド履歴を使用してください。

## 更新とデプロイの確認

1. 変更したファイルを確認し、コミットして `main` へpushします。
2. Cloudflareの対象プロジェクトで、pushしたコミットに対応するデプロイが開始されたか確認します。
3. デプロイの成功とコミットIDを確認します。
4. 公開ページで仮LPが表示されることを確認します。

今回の初回更新はREADMEと.gitignoreの整備のみです。LPの文章・デザインは変更していません。公開ページの見た目では反映を判別できないため、デプロイ履歴のコミットIDで確認してください。

APIキー、トークン、ローカルの環境変数ファイルはコミットしないでください。

## 公式資料

- [Cloudflare Workers: Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers: Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cloudflare Pages: Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

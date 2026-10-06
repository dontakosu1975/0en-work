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

公開先ドメインは `0en.work` です。以下は、この静的HTMLをCloudflare PagesのGit連携で公開する場合の設定例です。実際のプロジェクト種別・連携設定はCloudflare管理画面で確認してください。

| 設定 | 値 |
|---|---|
| Gitリポジトリ | `dontakosu1975/0en-work` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `.`（リポジトリ直下） |
| Root directory | リポジトリ直下（未指定） |
| Custom domain | `0en.work` |

Git連携と自動デプロイが有効なら、`main` へのpushで本番デプロイが開始されます。ビルド監視対象からREADMEなどを除外している場合、今回の文書更新だけではデプロイされないことがあります。

初期の `README.txt` はDirect Uploadの手順です。既存のPagesプロジェクトがDirect Uploadで作られている場合、そのプロジェクトを後からGit連携へ切り替えることはできません。Git連携のプロジェクトを別途用意する必要があります。

## 更新とデプロイの確認

1. 変更したファイルを確認し、コミットして `main` へpushします。
2. Cloudflareの対象プロジェクトで、pushしたコミットに対応するデプロイが開始されたか確認します。
3. デプロイの成功とコミットIDを確認します。
4. 公開ページで仮LPが表示されることを確認します。

今回の初回更新はREADMEと.gitignoreの整備のみです。LPの文章・デザインは変更していません。公開ページの見た目では反映を判別できないため、デプロイ履歴のコミットIDで確認してください。

APIキー、トークン、ローカルの環境変数ファイルはコミットしないでください。

## 公式資料

- [Cloudflare Pages: 静的HTMLのデプロイ](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Cloudflare Pages: Git連携](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages: Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

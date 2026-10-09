# Cloudflare Workers AI Text-to-Image PoC

0EN LPとは分離した、Cloudflare Workers AIの最小照会PoCです。Pythonの標準ライブラリでREST APIを呼び出し、Text-to-ImageのBase64レスポンスをPNGとして保存します。

## 確認結果

- Cloudflare APIのエンドポイントは `POST /accounts/{account_id}/ai/run/{model_name}`。
- `@cf/black-forest-labs/flux-1-schnell` はText-to-Imageモデルで、`result.image` にBase64画像が返ります。
- 返却データがPNGならそのまま保存し、JPEG等ならPillowでPNGへ変換します。
- 認証には `CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` が必要です。
- Workers AIの無料割当は合計10,000 Neurons/日です。超過時は後続リクエストが失敗します。画像1枚あたりの消費量はモデル・ステップ数等で変わるため、10,000 Neuronsで生成できる枚数は固定ではありません。
- このPoCは既存の0EN LP、Cloudflare Worker、D1、GitHub Actionsを変更しません。

## 認証情報の設定

APIトークンはCloudflareダッシュボードでWorkers AI REST APIを利用できる最小権限のトークンとして作成し、PowerShellの環境変数へ設定します。値をファイル、README、Gitへ保存しないでください。

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = "<account-id>"
$env:CLOUDFLARE_API_TOKEN = "<api-token>"
```

## 送信前の確認

```powershell
python .\generate_image.py --dry-run
```

これはネットワークへ接続せず、モデル・エンドポイント・出力先だけを表示します。

## 実行

```powershell
python .\generate_image.py --output .\cloudflare-ai-output.png
```

プロンプトを差し替える場合：

```powershell
python .\generate_image.py `
  --prompt "A calm Japanese small business hiring manager reviewing a job posting on a laptop, clean office, no text or logos" `
  --steps 4 `
  --output .\cloudflare-ai-output.png
```

## 公式資料

- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI REST API](https://developers.cloudflare.com/api/resources/ai/)
- [FLUX.1 schnell model](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/)
- [Workers AI errors](https://developers.cloudflare.com/workers-ai/platform/errors/)

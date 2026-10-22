# WORK仮データ v0.1

作成日：2026-10-22
対象：Phase 1の共通WORKスキーマ確認
状態：レビュー用の架空データ（DB・API・画面には未接続）

## 目的と注意

求人・0EN Builderの開発・個人の制作活動を、同じ共通WORK項目で表現するための仮データです。以下の名称・人物・事業者・求人内容はすべて架空です。`publication_status: published`も一覧・詳細PoCを想定した論理値であり、実際の公開を意味しません。

これは物理データ形式や求人スキーマ全体を確定するものではありません。特に求人の固有部分は、既存の求人案から意味が確定している一部だけを置いています。未確定項目を埋めた完成求人ではありません。

一覧・詳細PoCが読み込む機械可読データは [`poc/work-hub-v0.1/works.json`](../poc/work-hub-v0.1/works.json) です。以下のYAMLはレビュー用の内容例で、画面PoCのJSONと同じ3件を表します。

## 仮データ

```yaml
works:
  - id: work-job-sample-001
    schema_type: job
    created_at: "2026-10-01T09:00:00+09:00"
    updated_at: "2026-10-08T15:30:00+09:00"
    current_revision:
      id: revision-job-sample-001-v1
      schema_version: "0.1"
      title: "自動車部品の製造スタッフ"
      summary: "地域のものづくり企業で、自動車部品の製造を担う仕事です。"
      actor:
        type: group
        display_name: "東海ものづくり採用チーム（架空）"
      activity_status: active
      categories:
        - 製造
        - ものづくり
      images: []
      external_links: []
      type_data:
        job:
          employer:
            name: "みずほ部品工業株式会社（架空）"
          content:
            description: "自動車部品の製造ラインで、部品の加工・検品・梱包を担当します。手順書に沿って作業し、慣れるまでは先輩社員がサポートします。"
    publication_status: published
    related_work_ids: []

  - id: work-project-sample-001
    schema_type: generic_work
    created_at: "2026-09-20T10:00:00+09:00"
    updated_at: "2026-10-15T18:00:00+09:00"
    current_revision:
      id: revision-project-sample-001-v1
      schema_version: "0.1"
      title: "0EN Builderを開発する"
      summary: "専門的なコードを書かなくても、Webページを組み立てて公開できるツールを目指して開発しています。"
      actor:
        type: group
        display_name: "0EN Builder開発チーム（仮）"
      activity_status: active
      categories:
        - ソフトウェア開発
        - Web制作
      images: []
      external_links: []
      type_data:
        generic_work:
          description: "画面上の操作からページの構成を作り、プレビューしながら調整できるWeb制作ツールを試作しています。使う人がHTMLやCSSを一から書かずに、自分のページを形にできることを目標にしています。"
    publication_status: published
    related_work_ids: []

  - id: work-personal-sample-001
    schema_type: generic_work
    created_at: "2026-08-05T12:00:00+09:00"
    updated_at: "2026-10-12T20:00:00+09:00"
    current_revision:
      id: revision-personal-sample-001-v1
      schema_version: "0.1"
      title: "町の音を記録した音作品"
      summary: "身近な場所の音を記録し、短い音作品として制作しました。"
      actor:
        type: person
        display_name: "個人制作者（架空）"
      activity_status: completed
      categories:
        - 音楽・音作品
        - 制作活動
      images: []
      external_links: []
      type_data:
        generic_work:
          description: "駅前の夕方、商店街の朝、雨の日の公園などで環境音を録音し、編集して数分程度の音作品にまとめました。制作した作品の一部を小さな展示で紹介しました。"
    publication_status: published
    related_work_ids: []
```

## 作成中に確認できたこと・未解決点

### 求人固有データは完成形にできない

共通項目と既存の求人スキーマを混同しないため、求人の`title`は共通revisionに一度だけ置き、`content.title`を重複させていません。求人固有情報には、既存案で意味が明確な`employer.name`と`content.description`だけを記載しました。

このままでは公開可能な完成求人にはなりません。既存求人案では職種コード、雇用形態、勤務地、給与、勤務時間、休日、応募方法などを構造化して扱いますが、職種・地域等のコード体系やいくつかの運用条件は未確定です。PoC用の値を作るためにそれらを推測したり、仕事内容の文章へ給与・勤務地などを押し込んだりすることはしていません。求人詳細でこれらも表示する場合は、既存求人スキーマの該当項目・値の対応を別途確認する必要があります。

また、`actor`を採用チーム、`employer.name`を雇用主として別主体にしたため、このデータでは同一組織を二重保持する状況を避けています。同一主体となる求人の参照方法は、今回のデータでは検証できていません（参照方式を先取りしていません）。

### `generic_work`で表現できた範囲

開発プロジェクトと個人制作は、共通項目に加え、`generic_work.description`の本文だけで今回の紹介例を記述できました。現時点で種別固有スキーマを追加するほど繰り返す不足項目は確認できません。

一方で、開発の進捗・利用方法・成果物や、個人制作の作品一覧・公開先などは本文以外の表示にしたくなる可能性があります。今回は一例ずつのため、共通項目で足りないと結論づけず、後続PoCで同種の不足が繰り返すか観察します。

### 状態項目について

求人・開発は`activity_status: active`、個人制作は`activity_status: completed`とし、3件とも`publication_status: published`にしました。完了したWORKも公開状態を保てる例であり、活動状態と掲載状態を別に扱います。求人の活動状態は募集状況ではなく、`PublicationCycle.state=ended`から募集終了を導出するものでもありません。

## このデータの範囲外

- 共通スキーマや求人スキーマの改訂・確定
- 職種コード、雇用形態コード、勤務地コード等の選定
- 求人の募集状態、掲載回、公開期間の定義
- 管理主体、企業参照、権限、DB、API、認証
- 一覧・詳細画面、検索、公開操作

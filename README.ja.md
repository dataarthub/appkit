# Appkit

[English](README.md) | [日本語](README.ja.md)

ドキュメントサイトの[日本語ドキュメント](https://tech-docs.alneas.com/ja/appkit/)でプロジェクト全体の説明を案内しています。未翻訳・翻訳未確認のページでは英語版を参照してください。React 0.3.0の文書反映はnpm公開の確認後に行います。

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/docs/)
[![React](https://img.shields.io/badge/React-149ECA?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/en/docs)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh/docs)


[Core on npm](https://www.npmjs.com/package/@alneas/appkit-core) · [React on npm](https://www.npmjs.com/package/@alneas/appkit-react) · [Documentation](https://tech-docs.alneas.com/appkit/)

## Elevator Pitch

業務フォーム・検証・レコード操作を、共通のスキーマに沿って実装するためのTypeScript／Reactライブラリです。

## Why & Value

申請項目を一度定義し、保存前に検証して、アプリケーション側のデータアダプターへ接続できます。データベースとストレージの境界を明示し、AIの提案もアプリケーションの承認後に適用できます。

| 選択するパッケージ | 用途 |
| --- | --- |
| [Appkit Core](packages/appkit-core/README.md) | フレームワークに依存しない検証、ストレージ、レコード操作、グラフ、地域別ヘルパー |
| [Appkit React](packages/appkit-react/README.md) | React UI、スキーマフォーム、テーブル、AIレビュー画面。Coreに依存します。 |

CoreはReactなしで利用できます。ホストされたバックエンドは含まれません。認証・認可・永続化の最終的な書き込みは、利用するアプリケーションが管理します。

## Key Highlights

- 保存処理の境界を明示したスキーマフォームとレコードテーブル。
- フレームワークに依存しないストレージ・データ・グラフ・AI・地域別ヘルパー。
- npmパッケージは2つ。機能はサブパスからimportし、ReactはReactパッケージに分離しています。

## Quickstart

フォーム例にはNode.js 24+と、React／React DOM `^19.2.3` の既存アプリケーションが必要です。Coreだけを使う場合は[Coreの検証例](packages/appkit-core/README.md#usage)から始めてください。

以下はReact **0.3.0**とCore **0.2.0**を対象とします。npmでの公開を確認してからインストールしてください。ソースのバージョンだけでは公開済みとは判断できません。0.2.0からの更新にはDnDとコンポーネント型の破壊的変更があるため、先に[移行ガイド](https://github.com/dataarthub/appkit/blob/main/packages/appkit-react/docs/migration.md)を確認してください。

```bash
npm install @alneas/appkit-core@0.2.0 @alneas/appkit-react@0.3.0 react@^19.2.3 react-dom@^19.2.3 @tanstack/react-query@5.104.5 @tanstack/query-core@5.104.5
# Or use bun add with the same package names and versions.
```

TanStack Queryを直接importするため、明示的にインストールします。認証済みバックエンド用の`DataAccessAdapter`を`RequestForm`へ渡し、両方のデータプロバイダーとAppkit CSSの明示的なimportを維持してください。

```tsx
import { useState, type ComponentProps } from 'react';
import type { DataAccessAdapter } from '@alneas/appkit-core/data';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, DataAccessProvider } from '@alneas/appkit-react/tools/data-access/react';
import { FormView } from '@alneas/appkit-react/tools/form';
import '@alneas/appkit-react/styles';
const schema: ComponentProps<typeof FormView>['schema'] = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', minLength: 2 },
    reason: { type: 'string', title: 'Reason', 'x-ui': { widget: 'textarea' } },
  },
  required: ['name'],
};
export function RequestForm({ adapter }: { adapter: DataAccessAdapter }) {
  const [client] = useState(createQueryClient);
  const [saved, setSaved] = useState('');
  return <QueryClientProvider client={client}><DataAccessProvider adapter={adapter}>
    <FormView testId="persistence" collection="records" mode="create" schema={schema}
      validation={{ emptyStrings: 'preserve', locale: 'en', cast: { numericMode: 'strict' } }}
      onSuccess={record => setSaved(JSON.stringify(record))} />
    <output aria-label="Persisted">{saved}</output>
  </DataAccessProvider></QueryClientProvider>;
}
```

NameとReasonの入力欄を表示し、2文字未満の名前を拒否して、アダプターから返された保存結果を表示します。認可・移行・並行更新の確認・最終書き込みはアプリケーション側の責任です。[完全なフォーム例](packages/appkit-react/docs/request-form.md)で失敗・再試行の確認方法も説明しています。追加のpeerは各パッケージの公開エクスポート一覧を確認してください。すべてのプロバイダーを設定する必要はありません。

## Next Steps

| パッケージ | 機能のimport | ドキュメント |
| --- | --- | --- |
| `@alneas/appkit-core` | `/storage`, `/data`, `/japan`, `/graph`, `/ai`, `/us` | [Coreガイド](packages/appkit-core/README.md) |
| `@alneas/appkit-react` | `/ui`, `/tools`, `/ai`, `/styles` | [Reactガイド](packages/appkit-react/README.md) |

[移行ガイド](packages/appkit-react/docs/migration.md) · [完全なフォーム例](packages/appkit-react/docs/request-form.md) · [開発への参加](CONTRIBUTING.md) · [リリース手順](RELEASING.md)

決定的なチェックはAPIカタログ、メタデータ、開発者が記述した統合例、評価ハーネスを対象にします。選定アーカイブに対する適格な実モデル評価がなければ、コーディングエージェントの端から端までの能力は未検証です。[評価手順](docs/agent-evaluation.md)と[機械向け索引](https://github.com/dataarthub/appkit/blob/main/llms.txt)を参照してください。

正本は英語です。ポータルの取り込み・日本語翻訳・配信はドキュメント側が管理します。英語での質問・不具合報告も[GitHub Issues](https://github.com/dataarthub/appkit/issues)で受け付けています。

### Repository development

開発には最新のNode 24パッチまたはNode 26+（`^24.15.0 || >=26.0.0`）とBun 1.4.0を使います。配布パッケージのNode最小要件は24.0.0のままです。

```bash
bun install --frozen-lockfile --ignore-scripts
bun run build
bun run verify
```

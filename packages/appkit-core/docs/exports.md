---
title: "Public exports and optional peers"
description: "Exact install package, public import subpaths and optional peer requirements."
archetype: reference
project: tools
---

# Public exports and optional peers

Generated from package.json; edit the manifest and regenerate.

## Installation

```bash
bun add @alneas/appkit-core
```

## Public import

| Import target | Kind |
| --- | --- |
| `@alneas/appkit-core` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/storage` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/us` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/storage/server` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/storage/portable` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/storage/crypto` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/storage/zip` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/storage/contained-path` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/common-types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/cache-scope` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/resource-service` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/search-handlers` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/bignumber-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/sqlite` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/d1` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/supabase` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/supabase-graphql` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/mongodb` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/convex` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/neon` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/server` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/csv` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/encoding` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/pdf` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/finance` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/edi` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/content` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/google-calendar` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/editor` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/date-utils` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/core` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/compiler` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/inference` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/server` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/integrations/ai` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/integrations/task-graph` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/messages` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/slack` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/line` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/google-chat` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/excelize` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/cast` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/workflow` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/csv/parser` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/data-access/graph/postgres-ddl` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/data-access/graph/sql-identifier` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/data-access/graph/web-handler` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/data-access/http-graph-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/data-access/postgres-graph-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/editor/storage-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/encoding/html` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/csv-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/http-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/mock-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/utils` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/excel/wasm-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/finance/cost-calculation` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/google-calendar/api-client` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/google-calendar/calendar-event` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/google-calendar/event-mapper` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/google-calendar/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/min-heap` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/line/webhook-handler` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/pdf/business-document-types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/pdf/viewer-worker` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/codelists` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/converter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/db-mapping` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/exporter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/geo-data` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/json-extensions` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/json-schema` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/jsonpath` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/loaders` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/registry` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/schema-converter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/sql-column-inventory` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/typegen` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/verifier` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/server/contained-path` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/line/client` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/line/adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/slack/client` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/slack/adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/google-chat/client` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/notifications/google-chat/adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/async` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/google-calendar/watch` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/integrations/files` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/schema/introspection` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/content/git-markdown` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/data/integrations/supabase` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/proposal` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/generative-ui` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/agent-output` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/validation` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat/stream` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat/openai-compatible` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat/ai-sdk` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/tool-bridge` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/tool-types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/define-action-tool` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/schema-input` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/registry` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/action/execution` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/proposal/validation` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/proposal/engine` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/proposal/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/proposal/batch` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/generative-ui/validation` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/generative-ui/contract` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/generative-ui/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat/conversation` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai/ai-chat/session` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph/cpm` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph/in-memory-adapter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph/planning` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph/planning/graph` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/graph/planning/capacity-index` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/date-utils` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/finance` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/csv` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/pdf` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/excel` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/legal-document` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/ubl` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/to-quote-pdf` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/to-business-document` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/code-lists` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/to-invoice-pdf` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/validator` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/excel/invoice-template` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/pdf/business-document-presets` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/pdf/legal-document-pdfmake` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/legal-document/parser` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/legal-document/types` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/legal-document/constants` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/edi/factory` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/finance/invoice` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/pdf/stamp` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/notifications` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/holidays` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/integrations/data-engine` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/japan/holidays/calculated` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/us/holidays` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/us/format` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/us/documents` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-core/ai-instructions` | Metadata |
| `@alneas/appkit-core/package-context.json` | Metadata |

## Optional peers

Install an optional peer only when using its feature. Core entry loading does not certify a hosted backend.

| Peer | Version | Required |
| --- | --- | --- |
| `@supabase/supabase-js` | `^2.116.0` | No; feature-specific |
| `@neondatabase/serverless` | `^1.0.0` | No; feature-specific |
| `excelize-wasm` | `0.1.3` | No; feature-specific |
| `pg` | `^8.20.0` | No; feature-specific |
| `hono` | `^4.12.3` | No; feature-specific |

---
title: "Public exports and optional peers"
description: "Exact install package, public import subpaths and optional peer requirements."
sidebar:
  order: 10
archetype: reference
project: appkit
tags: ["appkit", "exports"]
---

# Public exports and optional peers

Generated from package.json; edit the manifest and regenerate.

## Installation

```bash
bun add @alneas/appkit-react
```

## Public import

| Import target | Kind |
| --- | --- |
| `@alneas/appkit-react` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ui` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ai` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/styles` | CSS |
| `@alneas/appkit-react/ui/theme` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ui/utils` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ui/hooks` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/core` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/ui` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/form` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/data-table` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/filter` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/pane` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/workflow` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/sidebar` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/header` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/splash` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/priority-queue` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/editable-table` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/error` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/i18n` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/data-access/react` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/theme` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/kanban` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/calendar` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/chart` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/barcode` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/file-browser` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/auth` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/tools/gantt` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ai/generative-ui` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ai/proposal` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ai/action` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ai/ai-chat` | ESM, CommonJS and NodeNext declarations |
| `@alneas/appkit-react/ui/styles` | CSS |
| `@alneas/appkit-react/tools/styles` | CSS |
| `@alneas/appkit-react/ai-instructions` | Metadata |
| `@alneas/appkit-react/package-context.json` | Metadata |
| `@alneas/appkit-react/api-index.json` | Metadata |

## Optional peers

Install an optional peer only when using its feature. Core entry loading does not certify a hosted backend.

| Peer | Version | Required |
| --- | --- | --- |
| `react` | `^19.2.3` | Yes |
| `react-dom` | `^19.2.3` | Yes |
| `recharts` | `^3.6.0` | No; feature-specific |
| `jsbarcode` | `^3.12.1` | No; feature-specific |
| `react-qr-code` | `^2.0.18` | No; feature-specific |
| `@yudiel/react-qr-scanner` | `^2.5.0` | No; feature-specific |
| `ai` | `^7.0.105` | No; feature-specific |
| `@types/json-schema` | `^7.0.15` | No; feature-specific |

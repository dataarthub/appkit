import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {isDeepStrictEqual} from 'node:util';

function files(root, directory) {
  if (!existsSync(path.join(root, directory))) return [];
  return readdirSync(path.join(root, directory), {withFileTypes: true}).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(root, file) : [file];
  });
}
function tokens(text) {
  const ast = ts.createSourceFile('source.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (ast.parseDiagnostics.length) return text;
  return ts.createPrinter({removeComments: true}).printFile(ast);
}
function proseOnly(change) {
  // Limit source exemptions to documentation changes; directives can change type checking.
  return /\.[cm]?tsx?$/.test(change.file) && typeof change.before === 'string' && typeof change.after === 'string' &&
    !/[@#](?:ts-|jsx|vite|vitest|__PURE__|__NO_SIDE_EFFECTS__)|<reference\b/.test(change.before + change.after) &&
    tokens(change.before) === tokens(change.after);
}
function metadataOnly(change) {
  if (typeof change.before !== 'string' || typeof change.after !== 'string') return false;
  const parse = text => {
    const result = ts.parseConfigFileTextToJson(change.file, text);
    if (result.error || !result.config || typeof result.config !== 'object') throw Error('Invalid metadata');
    return result.config;
  };
  try {
    const before = parse(change.before), after = parse(change.after);
    if (change.file === 'bun.lock') {
      // Only workspace version fields may differ; resolved packages and dependency
      // constraints must be identical. A dependency update is never metadata-only.
      for (const value of [before,after]) for (const key of ['packages/appkit-core','packages/appkit-react']) {
        if (value.workspaces?.[key]) delete value.workspaces[key].version;
      }
    } else {
      for (const value of [before,after]) delete value.version;
    }
    return isDeepStrictEqual(before, after);
  } catch {return false;}
}
function affectedStories(root, stories, changed) {
  let uncertain = false;
  const graph = new Map();
  // Paraglide output is absent in clean checkouts. Its committed inlang inputs
  // take the full-gate path; generated modules are opaque here, like dependencies.
  const generated = file => file.startsWith('packages/appkit-react/src/tools/paraglide/');
  function resolve(base) {
    const sourceBase = base.replace(/\.(?:[cm]?js|jsx)$/, '');
    const substituted = base.endsWith('.mjs') ? [sourceBase + '.mts'] : base.endsWith('.cjs') ? [sourceBase + '.cts'] : [];
    return [base, ...substituted, ...['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs', '.json', '/index.ts', '/index.tsx', '/index.js'].map(ext => sourceBase + ext)]
      .find(candidate => existsSync(candidate) && statSync(candidate).isFile());
  }
  function dependencies(file) {
    if (graph.has(file)) return graph.get(file);
    const imports = [];
    graph.set(file, imports);
    const ast = ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) uncertain = true;
    function walk(node) {
      // Explicit type-only declarations are erased; package typechecks cover them.
      if ((ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) || (ts.isExportDeclaration(node) && node.isTypeOnly)) return;
      let specifier;
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) specifier = node.moduleSpecifier;
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) specifier = node.moduleReference.expression;
      if (ts.isCallExpression(node) && /^import\.meta\.(?:glob|globEager)$/.test(node.expression.getText(ast))) uncertain = true;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(ast) === 'require')) {
        specifier = node.arguments[0];
        if (!specifier || !ts.isStringLiteralLike(specifier)) uncertain = true;
      }
      if (specifier && ts.isStringLiteralLike(specifier)) {
        const name = specifier.text;
        if (name.startsWith('.') || /^@alneas\/appkit-(?:core|react)(?:\/|$)/.test(name)) {
          let resolved;
          if (name.startsWith('.')) resolved = resolve(path.resolve(root, path.dirname(file), name));
          else {
            try {
              const packageName = name.match(/^@alneas\/appkit-(?:core|react)/)[0];
              const packageDirectory = 'packages/' + packageName.slice('@alneas/'.length);
              const manifest = JSON.parse(readFileSync(path.join(root, packageDirectory, 'package.json'), 'utf8'));
              const key = '.' + name.slice(packageName.length);
              const entry = manifest.exports[key]?.import?.default;
              if (typeof entry === 'string' && entry.startsWith('./dist/')) {
                resolved = resolve(path.join(root, packageDirectory, 'src', entry.slice(7).replace(/\.js$/, '')));
              }
            } catch { /* Unsupported export mapping: run all stories. */ }
          }
          const unresolvedGenerated = name.startsWith('.') && generated(path.relative(root, path.resolve(root, path.dirname(file), name)).split(path.sep).join('/'));
          if ((!resolved && !unresolvedGenerated) || (resolved && !resolved.startsWith(root + path.sep))) uncertain = true;
          else if (resolved) {
            const relative = path.relative(root, resolved).split(path.sep).join('/');
            imports.push(relative);
          }
        } else if (!/^(?:node:|bun:|@?[a-z0-9][a-z0-9._-]*(?:\/|$))/i.test(name) || name.startsWith('@/') || name.startsWith('~/')) uncertain = true;
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
    return imports;
  }
  function visit(file, seen = new Set()) {
    if (changed.has(file)) return true;
    if (seen.has(file) || generated(file) || !/\.[cm]?[jt]sx?$/.test(file)) return false;
    seen.add(file);
    // Visit each reachable module once per story; cache edges, not cyclic reachability.
    return dependencies(file).some(dependency => visit(dependency, seen));
  }
  // Decorators, loaders and setup modules are dependencies of every story.
  const globals = files(root, 'packages/appkit-react/.storybook').filter(file => /\.[cm]?[jt]sx?$/.test(file));
  if (globals.some(file => visit(file))) return stories;
  const selected = stories.filter(file => visit(file));
  return uncertain ? stories : selected;
}
export function selectChecks({root, changes, full = false}) {
  const stories = files(root, 'packages/appkit-react/stories').filter(file => file.endsWith('.stories.tsx')).sort();
  const plan = {version: 1, full, packages: full, release: full, docs: full, agent: full, compatibility: full, tooling: [], stories: []};
  const tooling = new Set(full ? ['quality', 'deployments', 'react-core', 'publish', 'verification', 'storybook'] : []);
  const browserChanges = new Set();
  let allStories = full;
  for (const change of changes) {
    const file = change.file;
    if (file.startsWith('packages/appkit-react/src/tools/paraglide/')) {allStories = true; plan.packages = plan.docs = plan.release = plan.compatibility = true; continue;}
    if ((/\.(?:md|txt)$/.test(file) && !file.startsWith('packages/appkit-react/public/') && !file.startsWith('packages/appkit-react/.storybook/')) || proseOnly(change)) {plan.docs = true; continue;}
    if (/^packages\/appkit-(core|react)\/src\/.+\.(?:test|spec)\.[jt]sx?$/.test(file)) {plan.packages = true; continue;}
    if (/^packages\/appkit-react\/stories\/.+\.[jt]sx?$/.test(file)) {
      browserChanges.add(file); tooling.add('storybook');
      if (change.status === 'D') allStories = true;
      continue;
    }
    if (/^packages\/appkit-(core|react)\/src\/.+\.[cm]?[jt]sx?$/.test(file)) {
      plan.packages = plan.release = plan.docs = plan.compatibility = true;
      if (file.startsWith('packages/appkit-core/src/ai/')) plan.agent = true;
      browserChanges.add(file);
      if (change.status === 'D') allStories = true;
      continue;
    }
    if ((/^packages\/appkit-(core|react)\/package.json$/.test(file) || file === 'bun.lock') && metadataOnly(change)) {
      plan.release = plan.docs = true; continue;
    }
    if (/^packages\/appkit-(core|react)\/(?:consumer-ai\/(?:api-index|package-context)\.json)$/.test(file)) {
      plan.docs = plan.agent = true; continue;
    }
    if (/^scripts\/(?:(?:test-unit|unit-report)\.mjs|verification\/unit-runner\.test\.mjs)$/.test(file)) {plan.packages = true; tooling.add('verification'); continue;}
    if (/^scripts\/verification\/(?:commands|plan|quality-runs|run|workflow).*\.(?:mjs)$/.test(file)) {tooling.add('verification'); continue;}
    if (['.github/workflows/publish.yml','.github/workflows/complete-approved.yml'].includes(file)) {tooling.add('publish'); continue;}
    if (file === '.github/workflows/record-npm-deployments.yml') {tooling.add('deployments'); continue;}
    if (file === 'react-core-policy.json' || /^scripts\/(?:check-react-core|react-core\/)/.test(file)) {plan.compatibility = true; tooling.add('react-core'); continue;}
    if (/^scripts\/(?:check-release|check-consumer)\.mjs$/.test(file)) {plan.release = true; plan.packages = true; continue;}
    if (/^scripts\/record-npm-deployments/.test(file)) {tooling.add('deployments'); continue;}
    if (/^scripts\/publish\//.test(file)) {tooling.add('publish'); continue;}
    if (/^scripts\/(?:agent\/|agent-eval\/|test-agent-tooling)/.test(file)) {plan.agent = true; plan.packages = plan.docs = true; continue;}
    // Known policy/configuration inputs and anything unknown use the conservative full gate.
    plan.full = plan.packages = plan.release = plan.docs = plan.agent = plan.compatibility = allStories = true;
    for (const name of ['quality', 'deployments', 'react-core', 'publish', 'verification', 'storybook']) tooling.add(name);
  }
  plan.stories = allStories ? stories : browserChanges.size ? affectedStories(root, stories, browserChanges) : [];
  if (plan.stories.length) tooling.add('storybook');
  plan.tooling = [...tooling].sort();
  return plan;
}

import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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
function affectedStories(root, stories, changed) {
  let uncertain = false;
  const graph = new Map();
  // Paraglide output is absent in clean checkouts. Its committed inlang inputs
  // take the full-gate path; generated modules are opaque here, like dependencies.
  const generated = file => file.startsWith('packages/appkit-react/src/tools/paraglide/');
  function resolve(base) {
    return [base, ...['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs', '.json', '/index.ts', '/index.tsx', '/index.js'].map(ext => base + ext)]
      .find(candidate => existsSync(candidate) && statSync(candidate).isFile());
  }
  function dependencies(file) {
    if (graph.has(file)) return graph.get(file);
    const imports = [];
    graph.set(file, imports);
    const ast = ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) uncertain = true;
    function walk(node) {
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
        if (name.startsWith('.') || name.startsWith('@alneas/appkit-react')) {
          let resolved;
          if (name.startsWith('.')) resolved = resolve(path.resolve(root, path.dirname(file), name));
          else {
            try {
              const manifest = JSON.parse(readFileSync(path.join(root, 'packages/appkit-react/package.json'), 'utf8'));
              const key = '.' + name.slice('@alneas/appkit-react'.length);
              const entry = manifest.exports[key]?.import?.default;
              if (typeof entry === 'string' && entry.startsWith('./dist/')) {
                resolved = resolve(path.join(root, 'packages/appkit-react/src', entry.slice(7).replace(/\.js$/, '')));
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
      if (file.startsWith('packages/appkit-core/') || change.status === 'D') allStories = true;
      continue;
    }
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

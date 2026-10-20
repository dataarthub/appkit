import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setupServer } from 'msw/node';

const root = path.resolve(import.meta.dirname, '..');
const pkg = path.join(root, 'packages/appkit-react');
const stories = path.join(pkg, 'stories');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

test('all story imports stay inside public sources or declared public dependencies', () => {
  const manifests = ['package.json', 'packages/appkit-react/package.json'].map(file =>
    JSON.parse(readFileSync(path.join(root, file), 'utf8')));
  const dependencies = new Set(manifests.flatMap(manifest =>
    Object.keys({ ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies })));
  const seen = new Set();
  function visit(file) {
    file = realpathSync(file);
    if (seen.has(file)) return;
    seen.add(file);
    assert.ok(file.startsWith(`${pkg}${path.sep}`), `Outside public React sources: ${file}`);
    const text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function check(node) {
      let specifier;
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        specifier = node.moduleSpecifier.text;
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
        specifier = node.arguments[0].text;
      }
      if (specifier) {
        assert.ok(!specifier.includes('@dataarthub/') && !specifier.includes('appkit-private'), `${file}: ${specifier}`);
        if (specifier.startsWith('.')) {
          const base = path.resolve(path.dirname(file), specifier);
          const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`]
            .find(candidate => { try { return statSync(candidate).isFile(); } catch { return false; } });
          assert.ok(resolved, `Unresolved public import ${specifier} in ${file}`);
          if (/\.tsx?$/.test(resolved)) visit(resolved);
        } else {
          const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
          assert.ok(dependencies.has(name), `Undeclared dependency ${specifier} in ${file}`);
        }
      }
      ts.forEachChild(node, check);
    }
    check(source);
  }
  for (const file of files(stories).filter(file => /\.tsx?$/.test(file))) visit(file);
});

test('browser gate keeps axe fatal, production styles and every story enabled', () => {
  const preview = readFileSync(path.join(pkg, '.storybook/preview.tsx'), 'utf8');
  const config = readFileSync(path.join(pkg, 'vitest.storybook.config.ts'), 'utf8');
  assert.match(preview, /a11y:\s*\{\s*test:\s*'error'/);
  assert.match(config, /tailwindcss\(\)/, 'contrast and geometry require real CSS compilation');
  assert.match(config, /react\(\)/);
  assert.match(config, /fileParallelism:\s*false/);
  for (const file of files(stories).filter(file => file.endsWith('.stories.tsx'))) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /test:\s*['"](?:off|todo)['"]|['"]!test['"]|enabled:\s*false/, `${file}: accessibility/test exclusions require review`);
  }
});

test('fetching compositions retain the full state and permission matrix', () => {
  const file = path.join(stories, 'verification/lifecycle.stories.tsx');
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const matrix = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)
      && node.initializer.expression.getText(source) === 'story') {
      const [domain, state] = node.initializer.arguments;
      assert.ok(ts.isStringLiteral(domain) && ts.isStringLiteral(state));
      const states = matrix.get(domain.text) ?? new Set();
      states.add(state.text); matrix.set(domain.text, states);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const domain of ['data-table', 'auth-profile', 'form-view', 'file-browser']) {
    assert.deepEqual([...matrix.get(domain)].sort(), ['loading', 'success', 'empty', 'error', 'signed-out', 'restricted', 'privileged'].sort(), domain);
  }
  // The lower-level preview API has no authorization contract; test its native four states.
  const preview = readFileSync(path.join(stories, 'verification/file-preview.stories.tsx'), 'utf8');
  for (const state of ['loading', 'success', 'empty', 'error']) assert.ok(preview.includes(`state: '${state}'`), state);
});

test('all shipped palettes retain explicit light and dark browser stories', () => {
  const file = path.join(stories, 'verification/theme.stories.tsx');
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const pairs = new Set();
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const values = Object.fromEntries(node.properties.filter(ts.isPropertyAssignment)
        .filter(p => ts.isStringLiteral(p.initializer)).map(p => [p.name.getText(source), p.initializer.text]));
      if (values.palette && values.mode) pairs.add(`${values.palette}/${values.mode}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const palette of ['default', 'blue', 'green', 'rose', 'orange', 'future']) {
    for (const mode of ['light', 'dark']) assert.ok(pairs.has(`${palette}/${mode}`), `${palette}/${mode}`);
  }
});


test('reselecting a lifecycle story creates a fresh HTTP scenario', async () => {
  // Node strips erasable TS; resolve only extensionless relative TS imports in
  // these real fixture modules. React/JSX and browser setup are never imported.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('.') && context.parentURL && !path.extname(specifier)) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
      return nextResolve(specifier, context);
    },
  });
  const server = setupServer();
  try {
    const { stateHandlers } = await import('../packages/appkit-react/stories/verification/http-handlers.ts');
    const { resolveHandlers } = await import('../packages/appkit-react/.storybook/msw-handlers.ts');
    const origin = 'http://appkit-storybook.test';
    const base = `${origin}/__appkit_verification__`;
    server.listen({ onUnhandledRequest: 'error' });
    const json = value => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    const formFactory = () => stateHandlers('form-view', 'success', { rejectFirstSave: true, origin });
    for (let selection = 0; selection < 2; selection += 1) {
      server.resetHandlers(...resolveHandlers(formFactory));
      const url = `${base}/form-view/success`;
      const sessionResponse = await fetch(`${url}/session`);
      assert.equal(sessionResponse.status, 200);
      assert.equal((await sessionResponse.json()).user.id, 'story-user');
      assert.equal((await (await fetch(`${url}/collections/records/record-1`)).json()).name, 'Acoustic survey');
      assert.equal((await fetch(`${url}/collections/records/record-1`, json({ name: 'Changed project' }))).status, 422);
      const saved = await fetch(`${url}/collections/records/record-1`, json({ name: 'Changed project' }));
      assert.equal(saved.status, 200);
      assert.equal((await saved.json()).name, 'Changed project');
      assert.equal(await (await fetch(`${url}/collections/records/record-1`, { method: 'DELETE' })).json(), true);
      assert.equal(await (await fetch(`${url}/collections/records/record-1`)).json(), null);
      assert.equal((await fetch(`${url}/logout`, { method: 'POST' })).status, 204);
      assert.equal((await fetch(`${url}/session`)).status, 401);
    }
    const filesFactory = () => stateHandlers('file-browser', 'success', { origin });
    for (let selection = 0; selection < 2; selection += 1) {
      server.resetHandlers(...resolveHandlers(filesFactory));
      const url = `${base}/file-browser/success/files/search?query=Survey`;
      assert.equal((await (await fetch(url)).json())[0].name, 'Survey notes.txt');
      assert.equal((await (await fetch(url)).json())[0].name, 'Survey notes (refreshed).txt');
    }
  } finally {
    server.close();
    hooks.deregister();
  }
});

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

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

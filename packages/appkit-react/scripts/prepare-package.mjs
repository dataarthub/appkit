/**
 * Prepare real CommonJS / NodeNext ESM declarations for @alneas/appkit-react
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function declarations(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? declarations(file) : entry.name.endsWith('.d.ts') ? [file] : [];
  });
}

for (const file of declarations(dist)) {
  const source = readFileSync(file, 'utf8');
  for (const commonjs of [false, true]) {
    const code = source.replace(
      /((?:from\s*|import\s*\(\s*|import\s*)['"])(\.[^'"]+)(['"])/g,
      (match, prefix, specifier, quote) => {
        if (specifier.endsWith('.js')) {
          return prefix + specifier.replace(/\.js$/, commonjs ? '.cjs' : '.js') + quote;
        }
        if (specifier.endsWith('.cjs')) {
          return prefix + specifier.replace(/\.cjs$/, commonjs ? '.cjs' : '.js') + quote;
        }

        const absolute = path.resolve(
          path.dirname(file),
          specifier.replace(/\.(?:js|ts|tsx)$/, ''),
        );
        const resolved = [
          absolute + '.d.ts',
          path.join(absolute, 'index.d.ts'),
        ].find(existsSync);

        if (!resolved) return match;

        let relative = path.relative(path.dirname(file), resolved).replaceAll('\\', '/');
        if (!relative.startsWith('.')) relative = './' + relative;
        return prefix + relative.replace(/\.d\.ts$/, commonjs ? '.cjs' : '.js') + quote;
      },
    );

    writeFileSync(commonjs ? file.replace(/\.d\.ts$/, '.d.cts') : file, code);
  }
}

console.log('Prepared dual-format NodeNext declarations (.d.ts and .d.cts) for appkit-react.');

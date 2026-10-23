import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {checkPolicy} from './react-core/policy.mjs';
import {runMatrix, verifyInstalledCore} from './react-core/runner.mjs';
import {fixtureManifest} from './react-core/fixture.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--release')) throw Error('Usage: check-react-core.mjs [--release]');
const release = args[0] === '--release';
const root = path.resolve(import.meta.dirname, '..');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const core = json(path.join(root, 'packages/appkit-core/package.json'));
const react = json(path.join(root, 'packages/appkit-react/package.json'));
const policy = json(path.join(root, 'react-core-policy.json'));
const versions = checkPolicy({core, react, policy, release});
if (versions.pendingRequirements.length) console.warn('Pending React Core adoption (React publication is blocked until adopted): ' + versions.pendingRequirements.join(', '));
mkdirSync(path.join(root, '.verification/react-core'), {recursive: true});
const evidence = mkdtempSync(path.join(root, '.verification/react-core/run-'));
const temporary = mkdtempSync(path.join(tmpdir(), 'appkit-react-core-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^(?:NODE_PATH|NODE_OPTIONS|NODE_AUTH_TOKEN|NPM_TOKEN|GH_TOKEN|GITHUB_TOKEN|GIT_.*|npm_config_.*|NPM_CONFIG_.*)$/.test(key)));
env.npm_config_registry = 'https://registry.npmjs.org';
env.npm_config_userconfig = path.join(temporary, 'empty.npmrc');
env.npm_config_globalconfig = path.join(temporary, 'empty-global.npmrc');
writeFileSync(env.npm_config_userconfig, ''); writeFileSync(env.npm_config_globalconfig, '');
let index = 0;
function run(command, args, cwd, label) {
  const logfile = path.join(evidence, String(++index).padStart(2, '0') + '-' + label + '.log');
  try {
    const output = execFileSync(command, args, {cwd, env, encoding: 'utf8', timeout: 300000, maxBuffer: 24 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
    writeFileSync(logfile, output);
    return output;
  } catch (error) {
    writeFileSync(logfile, String(error.stdout ?? '') + String(error.stderr ?? ''));
    throw Error(`${label} failed; inspect ${path.relative(root, logfile)}`);
  }
}
function pack(spec, cwd, name, expectedVersion) {
  const [info] = JSON.parse(run('npm', ['pack', ...(spec ? [spec] : []), '--ignore-scripts', '--workspaces=false', '--json', '--pack-destination', temporary], cwd, 'pack-' + name));
  if (info.name !== '@alneas/appkit-' + name || info.version !== expectedVersion) throw Error('Packed package identity mismatch');
  const file = path.join(temporary, info.filename);
  const integrity = 'sha512-' + createHash('sha512').update(readFileSync(file)).digest('base64');
  if (integrity !== info.integrity) throw Error('Packed archive integrity mismatch');
  return {file, version: info.version, integrity};
}
function files(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error('Symlinks are not allowed in copied React sources');
    return entry.isDirectory() ? files(file) : [file];
  });
}
let result;
try {
  // Registry and candidate archives are kept separately even when versions match.
  const current = pack(`@alneas/appkit-core@${versions.requiredCore}`, temporary, 'core', versions.requiredCore);
  const currentFile = path.join(temporary, 'current-core.tgz');
  cpSync(current.file, currentFile); current.file = currentFile;
  const candidate = pack(null, path.join(root, 'packages/appkit-core'), 'core', core.version);
  const reactArchive = pack(null, path.join(root, 'packages/appkit-react'), 'react', react.version);
  result = await runMatrix(async lane => {
    const fixture = path.join(temporary, lane);
    mkdirSync(fixture);
    const selected = lane === 'current' ? current : candidate;
    for (const directory of ['src', 'examples', 'messages']) {
      const source = path.join(root, 'packages/appkit-react', directory);
      files(source); cpSync(source, path.join(fixture, directory), {recursive: true});
    }
    cpSync(path.join(root, 'packages/appkit-react/tsconfig.json'), path.join(fixture, 'tsconfig.json'));
    cpSync(path.join(root, 'scripts/react-core/vitest.config.ts'), path.join(fixture, 'vitest.config.ts'));
    // Only the candidate lane intentionally substitutes the declared Core version.
    // The override prevents npm from silently installing a second, older Core for React.
    writeFileSync(path.join(fixture, 'package.json'), JSON.stringify(fixtureManifest({react,
      plugin: json(path.join(root, 'package.json')).devDependencies['@vitejs/plugin-react'],
      coreArchive: selected.file, reactArchive: reactArchive.file}), null, 2));
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps'], fixture, lane + '-install');
    const installed = verifyInstalledCore(fixture, selected);
    const bin = name => path.join(fixture, 'node_modules/.bin', name);
    for (const [compiler, version] of [['tsc6', 'Version 6.0.3'], ['tsc', 'Version 7.0.2']]) {
      if (run(bin(compiler), ['--version'], fixture, lane + '-version-' + compiler).trim() !== version) throw Error('Incorrect compiler routing: ' + compiler);
    }
    for (const compiler of ['tsc6', 'tsc']) {
      run(bin(compiler), ['--noEmit', '--project', 'tsconfig.json'], fixture, lane + '-source-types-' + compiler);
    }
    const unitFiles = files(path.join(fixture, 'src')).filter(f => /\.(test|spec)\.tsx?$/.test(f));
    const bunTests = unitFiles.filter(f => !/from\s*['"]vitest['"]/.test(readFileSync(f, 'utf8')));
    if (bunTests.length) run('bun', ['test', ...bunTests], fixture, lane + '-bun-tests');
    run(bin('vitest'), ['run', '--config', 'vitest.config.ts'], fixture, lane + '-unit-tests');
    writeFileSync(path.join(fixture, 'RequestForm.tsx'), readFileSync(path.join(fixture, 'examples/request-form.tsx'), 'utf8').replace(/^import ['"]@alneas\/appkit-react\/styles['"];?\r?\n/m, ''));
    writeFileSync(path.join(fixture, 'consumer.tsx'), `import * as root from '@alneas/appkit-react'; import * as ui from '@alneas/appkit-react/ui'; import * as tools from '@alneas/appkit-react/tools'; import * as ai from '@alneas/appkit-react/ai'; console.log(root,ui,tools,ai); export {RequestForm} from './RequestForm.js';\n`);
    writeFileSync(path.join(fixture, 'consumer-commonjs.cts'), `import root = require('@alneas/appkit-react'); import ui = require('@alneas/appkit-react/ui'); import tools = require('@alneas/appkit-react/tools'); import ai = require('@alneas/appkit-react/ai'); export const Button: typeof ui.Button = root.Button; console.log(tools,ai);\n`);
    writeFileSync(path.join(fixture, 'consumer-tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', jsx: 'react-jsx', strict: true, skipLibCheck: false, esModuleInterop: true, outDir: 'compiled', types: ['node', 'react', 'react-dom']}, files: ['consumer.tsx', 'consumer-commonjs.cts', 'RequestForm.tsx']}));
    run(bin('tsc'), ['--noEmit', '--project', 'consumer-tsconfig.json'], fixture, lane + '-consumer-types-7');
    run(bin('tsc6'), ['--project', 'consumer-tsconfig.json'], fixture, lane + '-consumer-types-6');
    writeFileSync(path.join(fixture, 'probe.mjs'), `import assert from 'node:assert/strict'; import {createElement} from 'react'; import {renderToString} from 'react-dom/server'; import {RequestForm} from './compiled/RequestForm.js'; for(const entry of ['@alneas/appkit-react','@alneas/appkit-react/ui','@alneas/appkit-react/tools','@alneas/appkit-react/ai']) assert(Object.keys(await import(entry)).length); const adapter=new Proxy({}, {get(){return ()=>{throw Error('SSR must not write records');};}}); assert(renderToString(createElement(RequestForm,{adapter})).includes('name="name"')); console.log('PASS ESM and request-form SSR');\n`);
    run(process.execPath, ['probe.mjs'], fixture, lane + '-ssr');
    run(process.execPath, ['-e', `for(const entry of ['@alneas/appkit-react','@alneas/appkit-react/ui','@alneas/appkit-react/tools','@alneas/appkit-react/ai']) require(entry);`], fixture, lane + '-commonjs');
    return {passed: true, ...installed, reactIntegrity: reactArchive.integrity, checks: ['source-types-6', 'source-types-7', 'unit-tests', 'consumer-types-6', 'consumer-types-7', 'ssr', 'esm', 'commonjs']};
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
} catch (error) {
  result = {passed: false, error: error.message};
  console.error(error.message); process.exitCode = 1;
} finally {
  writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({schemaVersion: 1, core: versions, policy, ...result}, null, 2) + '\n');
  rmSync(temporary, {recursive: true, force: true});
  console.log('React/Core evidence:', path.relative(root, evidence));
}

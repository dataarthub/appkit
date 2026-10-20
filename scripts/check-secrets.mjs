import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gitleaksVersion,localGitleaks} from './quality-tools.mjs';
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--staged')) {
  console.error('Usage: node scripts/check-secrets.mjs [--staged]');
  process.exit(2);
}
const binary = process.env.APPKIT_GITLEAKS_BINARY || (existsSync(localGitleaks) ? localGitleaks : 'gitleaks');
const version = spawnSync(binary, ['version'], {encoding: 'utf8', timeout: 10000});
if (version.status !== 0 || version.stdout.trim() !== gitleaksVersion) {
  console.error(`Gitleaks ${gitleaksVersion} is required. Run bun run secrets:setup before committing.`);
  process.exit(2);
}
const scan = spawnSync(binary, ['git', '--redact=100', '--no-banner', ...(args.includes('--staged') ? ['--pre-commit', '--staged'] : ['--log-opts=--all']), '.'], {stdio: 'inherit'});
if (scan.error) console.error('Secret scanner could not run. Commit blocked.');
process.exitCode = scan.status ?? 2;

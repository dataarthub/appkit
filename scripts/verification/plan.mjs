import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectChecks} from './impact.mjs';
import {findBaseline, githubRuns} from './quality-runs.mjs';

export const root = path.resolve(import.meta.dirname, '../..');
export async function createPlan({ci = false, full = false, env = process.env, directory = root, list = githubRuns({token:env.GITHUB_TOKEN})} = {}) {
  const root = directory;
  // Hooks export repository-specific Git variables. Resolve the explicitly chosen
  // worktree from cwd instead, including when tests use disposable repositories.
  const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const git = args => execFileSync('git', args, {cwd: root, env:gitEnv, encoding: 'utf8', maxBuffer: 32 * 1024 ** 2});
  const sha = git(['rev-parse', 'HEAD']).trim();
  let base = null;
  if (!full) {
    if (ci) {
      if (env.GITHUB_EVENT_NAME !== 'push' || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_SHA !== sha) full = true;
      else {
        // No API evidence or usable ancestor means full verification, never an empty pass.
        try {
          base = await findBaseline({sha, currentRun: env.GITHUB_RUN_ID, list,
            isAncestor: value => spawnSync('git', ['merge-base', '--is-ancestor', value, sha], {cwd: root, env:gitEnv}).status === 0});
        } catch (error) {console.warn(`No trusted quality baseline: ${error.message}. Running full checks.`);}
      }
    } else {
      try {base = git(['merge-base', 'HEAD', 'refs/remotes/origin/main']).trim();} catch { /* missing history: full */ }
    }
    if (!base) full = true;
  }
  const changes = [];
  if (base) {
    const entries = git(['diff', '--name-status', '-z', '--no-renames', base, ...(ci ? [sha] : []), '--']).split('\0');
    for (let i = 0; i < entries.length - 1; i += 2) changes.push({status: entries[i], file: entries[i + 1]});
    if (!ci) {
      for (const file of git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) changes.push({status:'A', file});
    }
    for (const change of changes) {
      if (change.status !== 'M' || !/\.[cm]?[jt]sx?$/.test(change.file)) continue;
      try {
        change.before = git(['show', `${base}:${change.file}`]);
        change.after = ci ? git(['show', `${sha}:${change.file}`]) : readFileSync(path.join(root, change.file), 'utf8');
      } catch { /* The impact selector conservatively treats unavailable contents as code. */ }
    }
  }
  return {...selectChecks({root, changes, full}), sha, base, changedFiles: changes.map(change => change.file)};
}
export function savePlan(plan, output = path.join(root, '.verification/quality-plan.json')) {
  mkdirSync(path.dirname(output), {recursive:true});
  writeFileSync(output, JSON.stringify(plan, null, 2) + '\n');
  console.log(JSON.stringify({base:plan.base, sha:plan.sha, full:plan.full, changed:plan.changedFiles.length, packages:plan.packages, compatibility:plan.compatibility, stories:plan.stories.length, tooling:plan.tooling}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(arg => !['--ci','--full'].includes(arg))) throw Error('Usage: plan.mjs [--ci] [--full]');
  const plan = await createPlan({ci:process.argv.includes('--ci'), full:process.argv.includes('--full')});
  savePlan(plan);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `browser=${plan.stories.length > 0}\npackages=${plan.packages}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Verification selection\n\nBase: ${plan.base ?? 'none (full verification)'}\n\nCommit: ${plan.sha}\n\nChanged files: ${plan.changedFiles.length}; package checks: ${plan.packages}; Core compatibility: ${plan.compatibility}; Storybook files: ${plan.stories.length} (each in four browser conditions).\n`);
}

import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {commandsForPlan, executeCommands} from './commands.mjs';
import {createPlan, savePlan, root} from './plan.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !['--ci-plan', '--node-compat', '--full', '--dry-run'].includes(arg))) throw Error('Unknown verification option');
const planFile = path.join(root, '.verification/quality-plan.json');
const plan = args.includes('--ci-plan') ? JSON.parse(readFileSync(planFile, 'utf8')) : await createPlan({full:args.includes('--full')});
if (!args.includes('--ci-plan')) savePlan(plan);
const head = execFileSync('git', ['rev-parse','HEAD'], {cwd:root, encoding:'utf8'}).trim();
if (plan.version !== 1 || plan.sha !== head || !Array.isArray(plan.stories)) throw Error('Verification plan is stale or invalid');
process.exitCode = executeCommands(commandsForPlan(plan, planFile, args.includes('--node-compat')), {cwd:root, dryRun:args.includes('--dry-run')});

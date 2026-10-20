import {spawnSync} from 'node:child_process';

export function commandsForPlan(plan, planFile, nodeCompatibility = false) {
const commands = [];
const add = (...command) => commands.push(command);
const bun = script => add('bun', 'run', script);
if (!nodeCompatibility) {
  bun('secrets:check'); bun('lint');
}
if (plan.packages) add('bun','run','turbo','run','build','typecheck','test');
if (!nodeCompatibility) {
  // Both the docs generator and self-importing stories consume package builds.
  if (!plan.packages && (plan.docs || plan.release || plan.stories.length)) bun('build');
  const tooling = {quality:'test:quality-tooling', deployments:'test:npm-deployments', 'react-core':'test:react-core-tooling', publish:'test:publish-tooling', verification:'test:verification-tooling', storybook:'check:storybook'};
  for (const name of plan.tooling) {
    if (!tooling[name]) throw Error(`Unknown tooling group: ${name}`);
    bun(tooling[name]);
  }
}
if (!nodeCompatibility) {
  if (plan.release) bun('check:release');
  if (plan.docs) bun('check:docs');
  if (plan.agent) bun('test:agent-tooling');
  if (plan.compatibility) bun('check:react-core');
  if (plan.stories.length) {
    bun('storybook:prepare');
    add('node','scripts/verification/browser.mjs','--plan',planFile);
  }
}
return commands;
}

export function executeCommands(commands, {cwd, dryRun = false, run = spawnSync} = {}) {
  for (const command of commands) {
    console.log(`> ${command.join(' ')}`);
    if (dryRun) continue;
    const result = run(command[0], command.slice(1), {cwd, stdio:'inherit'});
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

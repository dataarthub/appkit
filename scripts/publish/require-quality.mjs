import {releaseContext} from './context.mjs';
import {requireQuality, githubRuns} from '../verification/quality-runs.mjs';

const target = releaseContext();
const run = await requireQuality({sha:target.sha, list:githubRuns({token:process.env.GITHUB_TOKEN})});
console.log(`Source quality confirmed for ${target.sha}: run ${run.id}`);

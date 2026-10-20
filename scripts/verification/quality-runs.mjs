// Read-only GitHub evidence. Never accept a similarly named check from another workflow.
const repository = 'dataarthub/appkit';
export function githubRuns({token, fetchImpl = fetch} = {}) {
  return async function list({sha} = {}) {
    const runs = [];
    for (let page = 1; page <= 10; page++) {
      const query = new URLSearchParams({event: 'push', branch: 'main', per_page: '100', page: String(page)});
      if (sha) query.set('head_sha', sha);
      const response = await fetchImpl(`https://api.github.com/repos/${repository}/actions/workflows/quality.yml/runs?${query}`, {
        headers: {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(token ? {Authorization: `Bearer ${token}`} : {})},
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw Error(`Public quality evidence API failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.workflow_runs)) throw Error('Malformed Public quality evidence');
      runs.push(...data.workflow_runs);
      if (data.workflow_runs.length < 100) break;
    }
    return runs;
  };
}
function authoritative(run) {
  return run.path === '.github/workflows/quality.yml' && run.name === 'Public quality' &&
    run.event === 'push' && run.head_branch === 'main' && run.head_repository?.full_name === repository;
}
const passing = run => run.status === 'completed' && run.conclusion === 'success';
export async function requireQuality({sha, list}) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw Error('Public quality requires an exact commit SHA');
  const run = (await list({sha})).filter(run => authoritative(run) && run.head_sha === sha)
    .sort((a, b) => b.id - a.id)[0];
  if (!run || !passing(run)) throw Error(`Public quality has no completed successful main-push run for ${sha}; finish or rerun quality before retrying publication`);
  return run;
}
export async function findBaseline({sha, currentRun, list, isAncestor}) {
  const runs = (await list()).filter(run => authoritative(run) && run.id !== Number(currentRun) && run.head_sha !== sha)
    .sort((a, b) => b.id - a.id);
  const seen = new Set();
  for (const run of runs) {
    // The latest run for a SHA wins, even when an older run succeeded.
    if (seen.has(run.head_sha)) continue;
    seen.add(run.head_sha);
    if (passing(run) && /^[a-f0-9]{40}$/.test(run.head_sha) && await isAncestor(run.head_sha)) return run.head_sha;
  }
  return null;
}

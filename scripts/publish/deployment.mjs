// Only invoked after the public archive AND both required tag mappings match.
export async function recordPublication({target, api}) {
  const payload = {kind:'verified-npm-publication', name:target.name, version:target.version, integrity:target.integrity};
  const query = new URLSearchParams({sha:target.sha, environment:target.environment, task:'publish:npm'});
  const matches = [];
  for(let page=1;;page++) {
    const records = await api('GET',`deployments?${query}&per_page=100&page=${page}`);
    if(!Array.isArray(records)) throw Error('Invalid deployment list');
    matches.push(...records);
    if(records.length<100) break;
  }
  if(matches.some(record => record.payload?.integrity !== target.integrity || record.sha !== target.sha)) throw Error('Conflicting publication deployment');
  const record = matches[0] ?? await api('POST','deployments',{ref:target.sha, environment:target.environment, task:'publish:npm',
    auto_merge:false, required_contexts:[], production_environment:true, payload, description:`${target.name}@${target.version}`});
  if(!Number.isSafeInteger(record.id)) throw Error('Invalid deployment identity');
  await api('POST',`deployments/${record.id}/statuses`,{state:'success', environment_url:target.url,
    log_url:`https://github.com/dataarthub/appkit/actions/runs/${process.env.GITHUB_RUN_ID}`, auto_inactive:false});
}

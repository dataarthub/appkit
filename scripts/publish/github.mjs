export async function github(method, endpoint, body) {
  if (!process.env.GITHUB_TOKEN) throw Error('GitHub token is required');
  const response = await fetch(`https://api.github.com/repos/dataarthub/appkit/${endpoint}`, {
    method, headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`, Accept:'application/vnd.github+json', 'Content-Type':'application/json'},
    body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`GitHub ${method} ${endpoint}: HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

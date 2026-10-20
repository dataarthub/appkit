const cmp=(a,b)=>a<b?-1:a>b?1:0;
const clean=s=>s.replace(/[\u0000-\u001f\u007f-\u009f]/g,'');
function result(c,e,s){return {packageName:c.packageName,packageVersion:c.packageVersion,inputDigest:c.inputDigest,importPath:e.importPath,...(s?{symbol:s.name}:{}),signatures:s?.signatures??[],summary:clean(s?.summary??e.requirements.guide),requirements:e.requirements};}
export function searchCatalogs(loaded,query,limit=20){
 if(typeof query!=='string'||!query.trim()||query.length>500)throw Error('Invalid query');
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid limit');
 const q=query.trim().toLowerCase(),tokens=q.split(/\s+/u),matches=[];
 for(const {catalog:c}of loaded)for(const e of c.entries){
  for(const s of [undefined,...c.symbols.filter(s=>s.importPath===e.importPath)]){
   const name=(s?.name??'').toLowerCase(),spec=e.importPath.toLowerCase(),description=(s?.summary??'').toLowerCase(),guide=e.requirements.guide.toLowerCase();
   if(!tokens.every(t=>(name+' '+spec+' '+description+' '+guide).includes(t)))continue;
   const rank=name===q?0:spec===q?1:tokens.every(t=>(name+' '+spec).includes(t))?2:3;
   matches.push({rank,value:result(c,e,s)});
  }
 }
 return matches.sort((a,b)=>a.rank-b.rank||cmp(a.value.packageName,b.value.packageName)||cmp(a.value.importPath,b.value.importPath)||cmp(a.value.symbol??'',b.value.symbol??'')).slice(0,limit).map(x=>x.value);
}
export function showCatalogEntry(loaded,importPath,symbol){
 return loaded.flatMap(({catalog:c})=>c.entries.filter(e=>e.importPath===importPath).flatMap(e=>{
  const symbols=c.symbols.filter(s=>s.importPath===importPath&&(symbol===undefined||s.name===symbol));
  return [...(symbol===undefined?[result(c,e)]:[]),...symbols.map(s=>result(c,e,s))];
 }));
}

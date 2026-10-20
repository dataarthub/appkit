import ts from 'typescript';
export function readErrorCatalog(source){
 const ast=ts.createSourceFile('catalog.ts',source,ts.ScriptTarget.Latest,true);
 function literal(node){
  if(ts.isAsExpression(node)||ts.isParenthesizedExpression(node))return literal(node.expression);
  if(ts.isStringLiteral(node))return node.text;
  if(ts.isObjectLiteralExpression(node)){
   const value=Object.create(null);
   for(const prop of node.properties){if(!ts.isPropertyAssignment(prop)||!ts.isIdentifier(prop.name)&&!ts.isStringLiteral(prop.name))throw Error('Expected literal error catalog');const key=prop.name.text;if(Object.hasOwn(value,key)||['__proto__','prototype','constructor'].includes(key))throw Error('Invalid literal key');value[key]=literal(prop.initializer);}return value;
  }throw Error('Expected literal error catalog');
 }
 const declaration=ast.statements.filter(ts.isVariableStatement).flatMap(s=>s.declarationList.declarations).find(d=>d.name.getText(ast)==='ERROR_CATALOG');
 if(!declaration?.initializer)throw Error('Expected literal error catalog');
 const catalog=literal(declaration.initializer),records=[];
 if(Object.keys(catalog).sort().join(',')!=='action,chat,tool')throw Error('Invalid literal domains');
 for(const [domain,codes]of Object.entries(catalog))for(const [code,info]of Object.entries(codes)){
  if(!/^[A-Z_]+$/.test(code)||typeof info.recovery!=='string')throw Error('Invalid literal descriptor');
  records.push({domain,code,anchor:domain+'-'+code.toLowerCase().replaceAll('_','-'),recovery:info.recovery});
 }return records;
}
export function renderErrorGuide(descriptors){
 return '---\ntitle: "Recover from AI integration errors"\ndescription: "Stable AI error codes, safe recovery hints and application-owned retry decisions."\nsidebar:\n  order: 3\narchetype: reference\nproject: appkit\ntags: ["appkit", "ai", "errors"]\n---\n\n# Recover from AI integration errors\n\nGenerated from the Core error catalog. Applications own authorization, effect reconciliation and durable idempotency. Recovery hints do not authorize retries.\n\n## Public import\n\n`@alneas/appkit-core/ai`\n\n```typescript\nimport {getAIErrorInfo} from \'@alneas/appkit-core/ai\';\nconst hint = getAIErrorInfo(\'tool\', \'INVALID_INPUT\');\nconsole.log(hint?.recovery);\n```\n\n'+descriptors.map(d=>'## '+d.anchor+'\n\n`'+d.domain+' / '+d.code+'`\n\n'+d.recovery+'\n').join('\n')+'\nNever expose application-local causes, provider response bodies, credentials or private schema details. Preserve AbortError cancellation and inspect uncertain writes before any retry. Read the [AI trust boundary guide](ai.md).\n';
}

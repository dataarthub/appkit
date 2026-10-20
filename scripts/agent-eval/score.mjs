import ts from 'typescript';import path from 'node:path';import {existsSync,readFileSync} from 'node:fs';
import {seedStatements} from './seed-evidence.mjs';
import {loadCatalogs} from '../agent/load-catalogs.mjs';
export const referenceKey=r=>JSON.stringify([r.packageName,r.importPath,r.symbol??'',r.member??'']);
export function analyzeSubmission({solutionFiles,consumerDir,seedReferences=[],allowedImports,requiredIntegration=[]}){
 const {loaded}=loadCatalogs({root:consumerDir,scope:'all'}),catalogs=loaded.map(x=>x.catalog),references=new Map(),violations=new Set(),imports=[],bindings=new Map(),integrationUses=new Set();let needsReview=false;
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,strict:true,skipLibCheck:false,noEmit:true,jsx:ts.JsxEmit.ReactJSX,types:['node','react','react-dom'].filter(n=>existsSync(path.join(consumerDir,'node_modules/@types',n)))};
 const styleFile=path.join(consumerDir,'appkit-styles.d.ts');const program=ts.createProgram([...solutionFiles,...(existsSync(styleFile)?[styleFile]:[])],options),checker=program.getTypeChecker();
 const add=r=>references.set(referenceKey(r),r);
 function moduleInfo(spec){const c=catalogs.find(c=>spec===c.packageName||spec.startsWith(c.packageName+'/'));return c?{packageName:c.packageName,importPath:spec,catalog:c}:undefined;}
 function checkImport(spec){
  imports.push(spec);if(allowedImports&&!allowedImports.some(p=>p.endsWith('/*')?spec.startsWith(p.slice(0,-1)):spec===p))violations.add('IMPORT_NOT_ALLOWED');
  if(spec.startsWith('node:')||['fs','child_process','vm','module','process'].includes(spec))violations.add('PROCESS_OR_FS_ESCAPE');
  const info=moduleInfo(spec);
  if(spec.startsWith('@alneas/')&&(!info||!info.catalog.entries.some(e=>e.importPath===spec)))add({packageName:info?.packageName??spec.split('/').slice(0,2).join('/'),importPath:spec});return info;
 }
 function checkName(info,name){if(info&&!info.catalog.symbols.some(s=>s.importPath===info.importPath&&s.name===name))add({packageName:info.packageName,importPath:info.importPath,symbol:name});}
 function origin(node,depth=0){
  if(!node||depth>12)return undefined;
  if(ts.isCallExpression(node)||ts.isNewExpression(node)||ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isNonNullExpression(node))return origin(node.expression,depth+1);
  if(ts.isPropertyAccessExpression(node)){const o=origin(node.expression,depth+1);return o?.namespace?{...o,namespace:false,symbol:node.name.text}:o;}
  if(ts.isIdentifier(node)){
   const symbol=checker.getSymbolAtLocation(node);if(bindings.has(symbol))return bindings.get(symbol);
   for(const d of symbol?.declarations??[]){if(ts.isVariableDeclaration(d)&&d.initializer)return origin(d.initializer,depth+1);if(ts.isParameter(d)&&d.type&&ts.isTypeReferenceNode(d.type))return origin(d.type.typeName,depth+1);}
  }return undefined;
 }
 const sources=solutionFiles.map(f=>program.getSourceFile(f)).filter(Boolean);
 for(const source of sources){
  if(/@ts-(ignore|nocheck|expect-error)\b/.test(source.text))violations.add('COMPILER_SUPPRESSION');
  for(const n of source.statements){
   if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)){
    const info=checkImport(n.moduleSpecifier.text);
    if(ts.isImportDeclaration(n)&&n.importClause){const clause=n.importClause;
     if(clause.name){checkName(info,'default');if(info)bindings.set(checker.getSymbolAtLocation(clause.name),{...info,symbol:'default'});}
     if(clause.namedBindings&&ts.isNamespaceImport(clause.namedBindings)){if(info)bindings.set(checker.getSymbolAtLocation(clause.namedBindings.name),{...info,namespace:true});}
     else for(const e of clause.namedBindings?.elements??[]){const name=(e.propertyName??e.name).text;checkName(info,name);if(info)bindings.set(checker.getSymbolAtLocation(e.name),{...info,symbol:name});}
    }else if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)checkName(info,(e.propertyName??e.name).text);
   }
  }
 }
 for(const source of sources){function visit(n){
  if(ts.isCallExpression(n)||ts.isNewExpression(n)){const o=origin(n.expression);if(o?.symbol)integrationUses.add(o.symbol);if(o?.namespace&&ts.isPropertyAccessExpression(n.expression))integrationUses.add(n.expression.name.text);}
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const o=origin(n.tagName);if(o?.symbol)integrationUses.add(o.symbol);}
  if(ts.isIdentifier(n)&&ts.isCallExpression(n.parent)&&n.parent.arguments.includes(n)){const o=origin(n);if(o?.symbol)integrationUses.add(o.symbol);}
  if(ts.isIdentifier(n)&&['eval','Function','process','require'].includes(n.text))violations.add('PROCESS_OR_EVAL_ESCAPE');
  if(ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal)){const info=checkImport(n.argument.literal.text);if(n.qualifier)checkName(info,n.qualifier.getText(source).split('.')[0]);}
  if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword){if(n.arguments.length===1&&ts.isStringLiteral(n.arguments[0]))checkImport(n.arguments[0].text);else violations.add('DYNAMIC_IMPORT');}
  if(ts.isAsExpression(n)||ts.isTypeAssertionExpression(n)){
   if(n.type.kind===ts.SyntaxKind.AnyKeyword)violations.add('UNCHECKED_ANY');
   else if(n.type.kind!==ts.SyntaxKind.UnknownKeyword&&n.type.getText(source)!=='const'&&(checker.getTypeAtLocation(n.expression).flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown)))needsReview=true;
  }
  if(ts.isPropertyAccessExpression(n)||ts.isElementAccessExpression(n)){
   const o=origin(n.expression);if(o){
    const member=ts.isPropertyAccessExpression(n)?n.name.text:n.argumentExpression&&ts.isStringLiteralLike(n.argumentExpression)?n.argumentExpression.text:undefined;
    if(member===undefined)violations.add('DYNAMIC_API_ACCESS');
    else if(o.namespace)checkName(o,member);
    else if(!checker.getPropertyOfType(checker.getTypeAtLocation(n.expression),member))add({packageName:o.packageName,importPath:o.importPath,symbol:o.symbol,member});
   }
  }ts.forEachChild(n,visit);
 }visit(source);}
 for(const requirement of requiredIntegration)if(!requirement.symbols.some(s=>integrationUses.has(s)))violations.add('REQUIRED_APPKIT_INTEGRATION');
 const unsupportedReferences=[...references.values()].sort((a,b)=>referenceKey(a)<referenceKey(b)?-1:1),seeds=new Set(seedReferences.filter(r=>{const actual=sources.flatMap(source=>seedStatements(source.text,source.fileName,r)).sort();return Array.isArray(r.statements)&&r.statements.length>0&&JSON.stringify(actual)===JSON.stringify(r.statements);}).map(referenceKey));
 const diagnostics=ts.getPreEmitDiagnostics(program).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ').replaceAll(path.resolve(consumerDir),'<consumer>')}));
 const diagnosticCategories=[...new Set([...violations,...diagnostics.map(d=>d.code===2307?'MISSING_MODULE':'TS_'+d.code)])];
 return {apiConformant:!references.size&&!violations.size,typecheckPassed:diagnostics.length===0,unsupportedApiCount:references.size,hallucinatedApiCount:unsupportedReferences.filter(r=>!seeds.has(referenceKey(r))).length,unsupportedReferences,diagnosticCategories,needsReview,integrationUses:[...integrationUses].sort(),imports:[...new Set(imports)],diagnostics};
}
export function assessSubmission({analysis,behavior,expectedAssertions=[],safetyAssertions=[]}){
 const assertions=Array.isArray(behavior?.assertions)?behavior.assertions:[],ids=assertions.map(a=>a.id),complete=expectedAssertions.length>0&&ids.length===expectedAssertions.length&&new Set(ids).size===ids.length&&expectedAssertions.every(id=>ids.includes(id));
 const testedSafety=safetyAssertions.every(id=>assertions.some(a=>a.id===id&&a.passed===true));
 const safe=assertions.some(a=>safetyAssertions.includes(a.id)&&a.passed!==true)?'fail':complete&&testedSafety?'pass':'not-run';
 return {apiConformant:analysis.apiConformant,typecheckPassed:analysis.typecheckPassed,behavior:{passed:complete&&assertions.every(a=>a.passed===true),assertions},safety:safe,unsupportedApiCount:analysis.unsupportedApiCount,hallucinatedApiCount:analysis.hallucinatedApiCount,unsupportedReferences:analysis.unsupportedReferences,diagnosticCategories:analysis.diagnosticCategories,needsReview:analysis.needsReview};
}

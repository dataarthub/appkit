import ts from 'typescript';import path from 'node:path';
const printer=ts.createPrinter({removeComments:true});
// Compare canonical statements, including every use of a seeded import binding.
export function seedStatements(text,file,reference){
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),names=new Set();
 for(const n of source.statements)if(ts.isImportDeclaration(n)&&n.moduleSpecifier.text===reference.importPath){for(const e of n.importClause?.namedBindings?.elements??[])if((e.propertyName??e.name).text===reference.symbol)names.add(e.name.text);}
 if(!names.size)return [];
 return source.statements.filter(n=>{let found=false;function visit(x){if(ts.isIdentifier(x)&&names.has(x.text))found=true;ts.forEachChild(x,visit);}visit(n);return found;}).map(n=>path.basename(file)+'\0'+printer.printNode(ts.EmitHint.Unspecified,n,source)).sort();
}

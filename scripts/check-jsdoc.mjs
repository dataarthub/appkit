/** Check singleton JSDoc block tags in maintained package source without executing it. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
export function duplicateJSDocTags(text,file) {
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),issues=[],seen=new Set();
  const visit=node=>{
    for(const comment of node.jsDoc??[]) {
      if(seen.has(comment.pos))continue;seen.add(comment.pos);
      const counts=new Map();let fence;
      for(const raw of comment.getText(source).split(/\r?\n/)) {
        const line=raw.replace(/^\s*\/\*\*\s?/, '').replace(/^\s*\*\s?/, '').trimStart();
        const marker=line.match(/^(`{3,}|~{3,})/);
        if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=undefined;continue;}
        if(fence)continue;
        const tag=line.match(/^@(remarks|returns|return)\b/)?.[1];
        if(tag){const name=tag==='return'?'@returns':'@'+tag;counts.set(name,(counts.get(name)??0)+1);}
      }
      for(const[tag,count]of counts)if(count>1)issues.push({file,line:source.getLineAndCharacterOfPosition(comment.getStart(source)).line+1,tag,count});
    }
    ts.forEachChild(node,visit);
  };visit(source);return issues;
}
export function checkJSDoc(root=path.resolve(import.meta.dirname,'..')) {
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
  const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,env,encoding:'utf8'}).split('\0'))].filter(file=>/^packages\/appkit-(?:core|react)\/src\/.*\.tsx?$/.test(file));
  assert(files.length,'Nonempty package source selection required for JSDoc verification');
  const issues=files.flatMap(file=>duplicateJSDocTags(readFileSync(path.join(root,file),'utf8'),file));
  return {files:files.length,issues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    assert.equal(process.argv.length,2,'No JSDoc checker options are supported');
    const result=checkJSDoc();
    for(const issue of result.issues)console.error(`${issue.file}:${issue.line}: duplicate ${issue.tag} (${issue.count}); combine the documentation blocks`);
    assert.equal(result.issues.length,0,'Duplicate singleton JSDoc block tags');
    console.log(`PASS: singleton JSDoc remarks/returns tags in ${result.files} selected source files`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}

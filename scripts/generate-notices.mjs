import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'packages/appkit-react');
let text='# Third-party notices\n\nLicense texts for CSS included in this package. JavaScript dependencies are external and retain their own distributed licenses.\n\n## Vendored shadcn Tailwind styles\n\n'+readFileSync(path.join(dir,'src/ui/vendor/shadcn-LICENSE.txt'),'utf8').trim()+'\n';
for(const name of ['tailwindcss','tw-animate-css']){
 const folder=[path.join(dir,'node_modules',name),path.join(root,'node_modules',name)].find(p=>existsSync(path.join(p,'package.json')));
 if(!folder)throw Error('Install frozen dependencies before generating notices: '+name);
 const pkg=JSON.parse(readFileSync(path.join(folder,'package.json')));
 text+='\n## '+name+' '+pkg.version+'\n\n'+readFileSync(path.join(folder,'LICENSE'),'utf8').trim()+'\n';
}
writeFileSync(path.join(dir,'THIRD_PARTY_NOTICES.md'),text);
console.log('Retained CSS license texts for shadcn, tailwindcss and tw-animate-css');

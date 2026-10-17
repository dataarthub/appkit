import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {readdirSync} from 'node:fs';
import path from 'node:path';
const root=import.meta.dirname;
function entries(dir: string): string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const file=path.join(dir,e.name);return e.isDirectory()?entries(file):/\.tsx?$/.test(file)&&!file.endsWith('.d.ts')&&!/\.(test|spec)\.tsx?$/.test(file)?[file]:[];});}
export default defineConfig({
 logLevel:'warn',
 plugins:[dts({entryRoot:'src',exclude:['**/*.test.ts','**/*.test.tsx'],afterDiagnostic(diagnostics){if(diagnostics.some(d=>d.category===1))throw Error('Declaration type checking failed');}})],
 build:{target:'es2022',sourcemap:true,emptyOutDir:true,
  lib:{entry:Object.fromEntries(entries(path.join(root,'src')).map(file=>[path.relative(path.join(root,'src'),file).replace(/\.tsx?$/,''),file])),formats:['es','cjs'],fileName:(format,name)=>`${name}.${format==='es'?'js':'cjs'}`},
  rolldownOptions:{external:id=>!id.startsWith('.')&&!path.isAbsolute(id),output:{preserveModules:true,preserveModulesRoot:path.join(root,'src'),exports:'named',hoistTransitiveImports:false}}
 }
});

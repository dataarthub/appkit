import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
function tests(dir: string): string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tests(path.join(dir,e.name)):/\.(test|spec)\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const root=process.cwd();
export default defineConfig({root,plugins:[react()],test:{include:tests(path.join(root,'src')).filter(file=>/from\s*['"]vitest['"]/.test(readFileSync(file,'utf8'))),environment:'node',maxWorkers:2}});

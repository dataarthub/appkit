import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const report={startedAt:new Date().toISOString(),cases:[],errors:[],runtime:{node:process.version},scope:'standalone behavior spike, not Appkit integration/Storybook gate'};
const output='../../logs/dnd-kit-spike';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});report.runtime.browser=browser.version();
const configurations=process.env.SPIKE_QUICK?[{width:1280,height:900,colorScheme:'light'}]:[{width:1280,height:900,colorScheme:'light'},{width:390,height:844,colorScheme:'light'},{width:1280,height:900,colorScheme:'dark'},{width:390,height:844,colorScheme:'dark'}];
const engines=process.env.SPIKE_ENGINE?[process.env.SPIKE_ENGINE]:['legacy','candidate'];
try{for(const configuration of configurations){
 const context=await browser.newContext({viewport:configuration,colorScheme:configuration.colorScheme});
 const page=await context.newPage();page.setDefaultTimeout(3500);
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 for(const engine of engines){
  const base=`http://127.0.0.1:5198/?engine=${engine}`;
  const load=async(extra='')=>{await page.goto(base+extra);await page.locator('[data-card=a]').waitFor();if(!extra.includes('readonly'))await page.waitForFunction(()=>!!document.querySelector('[data-card=a]').getAttribute('aria-describedby'));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  const json=async(selector)=>JSON.parse(await page.locator(selector).textContent());
  const tasks=()=>json('[data-tasks]');const calls=()=>json('[data-calls]');const order=()=>json('[data-order]');
  const settled=()=>page.waitForTimeout(120);
  const status=async(expected)=>{await page.waitForFunction(status=>JSON.parse(document.querySelector('[data-tasks]').textContent).find(t=>t.id==='a').status===status,expected);};
  const start=async(key='Space')=>{await page.locator('[data-card=a]').focus();await page.keyboard.press(key);await settled();};
  const key=async(k)=>{await page.keyboard.press(k);await settled();};
  const drag=async(source,target)=>{
   await source.scrollIntoViewIfNeeded();const a=await source.boundingBox();assert(a);
   await page.mouse.move(a.x+a.width/2,a.y+15);await page.mouse.down();await page.mouse.move(a.x+a.width/2+15,a.y+15,{steps:4});await settled();
   await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();assert(b);
   await page.mouse.move(b.x+b.width/2,b.y+Math.min(b.height/2,80),{steps:15});await settled();await page.mouse.up();await settled();
  };
  const run=async(name,fn)=>{const start=Date.now();try{await fn();assert.deepEqual(pageErrors,[]);report.cases.push({engine,configuration,name,pass:true,ms:Date.now()-start});console.log('PASS',engine,configuration.colorScheme,configuration.width,name);}catch(error){const file=`${output}/${engine}-${configuration.width}-${configuration.colorScheme}-${name.replace(/[^a-z0-9]+/gi,'-')}.png`;await page.screenshot({path:file,fullPage:true}).catch(()=>{});report.cases.push({engine,configuration,name,pass:false,error:error.message,body:await page.locator('body').innerText().catch(()=>''),pageErrors:[...pageErrors],screenshot:file});console.log('FAIL',engine,name,error.message);}};
  await run('preset keyboard empty column',async()=>{await load();await start();await key('ArrowRight');await key('Space');await status('empty');assert.deepEqual(await calls(),[{taskId:'a',status:'empty'}]);assert.equal((await tasks()).filter(t=>t.status==='todo')[0].id,'b');});
  await run('keyboard populated column',async()=>{await load();await start('Enter');await key('ArrowRight');await key('ArrowRight');await key('Enter');await status('done');assert.equal((await calls()).length,1);});
  await run('keyboard Escape cancel',async()=>{await load();await start();await key('ArrowRight');await key('Escape');assert.equal((await tasks())[0].status,'todo');assert.deepEqual(await calls(),[]);await page.waitForFunction(()=>document.querySelectorAll('[data-overlay]').length===0);});
  await run('compound keyboard empty column',async()=>{await load('&mode=compound');await start();await key('ArrowRight');await key('Space');await status('empty');assert.equal((await calls()).length,1);});
  await run('read only blocks keyboard',async()=>{await load('&readonly=1');await start();await key('ArrowRight');await key('Space');assert.equal((await tasks())[0].status,'todo');assert.deepEqual(await calls(),[]);});
  await run('same column keeps order and no callback',async()=>{await load();await start();await key('Space');assert.deepEqual((await tasks()).map(t=>t.id),['a','b','c']);assert.deepEqual(await calls(),[]);});
  await run('column boundary no wrap',async()=>{await load();await start();await key('ArrowLeft');await key('Space');assert.equal((await tasks())[0].status,'todo');assert.deepEqual(await calls(),[]);});
  await run('pointer empty column',async()=>{await load();await drag(page.locator('[data-card=a]'),page.locator('[data-column=empty]'));await status('empty');assert.equal((await calls()).length,1);});
  await run('keyboard then pointer in same provider',async()=>{await load();await start();await key('ArrowRight');await key('Space');await status('empty');await page.waitForFunction(()=>document.querySelectorAll('[data-overlay]').length===0);await drag(page.locator('[data-card=a]'),page.locator('[data-card=c]'));await status('done');assert.equal((await calls()).length,2);});
  await run('one overlay while active',async()=>{await load();await start();assert.equal(await page.locator('[data-overlay]').count(),1);await key('Escape');await page.waitForFunction(()=>document.querySelectorAll('[data-overlay]').length===0);assert.equal(await page.locator('[data-overlay]').count(),0);});
  await run('pointer populated column card',async()=>{await load();await drag(page.locator('[data-card=a]'),page.locator('[data-card=c]'));await status('done');assert.equal((await calls()).length,1);});
  await run('pointer below activation distance',async()=>{await load();const box=await page.locator('[data-card=a]').boundingBox();await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x+15,box.y+10);await page.mouse.up();assert.deepEqual(await calls(),[]);});
  await run('Japanese keyboard instructions attached',async()=>{await load();const card=page.locator('[data-card=a]');await page.waitForFunction(()=>!!document.querySelector('[data-card=a]').getAttribute('aria-describedby'));const id=await card.getAttribute('aria-describedby');assert.match(await page.locator(`[id="${id}"]`).textContent(),/左右矢印/);});
  const freshTable=async()=>{await load();await page.evaluate(()=>localStorage.clear());await load();};
  const tableKey=async()=>{const handle=page.getByRole('button',{name:'Reorder column status',exact:true});await handle.focus();await key('Space');await key('ArrowRight');await key('Space');};
  await run('table keyboard order and focus',async()=>{await freshTable();await tableKey();await page.waitForFunction(()=>document.querySelector('[data-order]').textContent==='["select","email","status","amount"]');assert.equal(await page.locator('button:focus').getAttribute('aria-label'),'Reorder column status');assert.deepEqual(await page.locator('thead th').evaluateAll(nodes=>nodes.map(n=>n.dataset.header)),await order());});
  await run('table sort button stays separate',async()=>{await freshTable();await page.getByRole('button',{name:'status',exact:true}).click();assert.equal(await page.locator('[data-sort]').textContent(),'ascending');assert.deepEqual(await order(),['select','status','email','amount']);await tableKey();assert.equal(await page.locator('[data-header=status]').getAttribute('aria-sort'),'ascending');assert.equal(await page.locator('[data-sort]').textContent(),'ascending');assert.deepEqual(await page.locator('th').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,tab:n.getAttribute('tabindex'),role:n.getAttribute('role')}))),Array.from({length:4},()=>({tag:'TH',tab:null,role:null})));});
  await run('table Escape restores order',async()=>{await freshTable();await page.getByRole('button',{name:'Reorder column status',exact:true}).focus();await key('Space');await key('ArrowRight');await key('Escape');assert.deepEqual(await order(),['select','status','email','amount']);assert.deepEqual(await page.locator('thead th').evaluateAll(nodes=>nodes.map(n=>n.dataset.header)),await order());});
  await run('table pointer reorder',async()=>{await freshTable();await drag(page.getByRole('button',{name:'Reorder column status',exact:true}),page.locator('[data-header=email]'));await page.waitForFunction(()=>document.querySelector('[data-order]').textContent==='["select","email","status","amount"]');});
  await run('table order persists reload',async()=>{await freshTable();await tableKey();assert.deepEqual(await order(),['select','email','status','amount']);await load();assert.deepEqual(await order(),['select','email','status','amount']);assert.deepEqual(await page.locator('tbody tr').first().locator('td').evaluateAll(nodes=>nodes.map(n=>n.dataset.cell)),await order());});
  if(engine==='candidate')await run('new sortable source target identity evidence',async()=>{await freshTable();await tableKey();const [event]=await json('[data-events]');assert.equal(event.source,'status');assert.equal(event.initialIndex,1);assert.equal(event.index,2);report.sortableSample=event;});
 }
 await context.close();
}
// Actual touch events, not merely mobile viewport dimensions.
for(const engine of engines){
 const context=await browser.newContext({viewport:{width:1000,height:800},hasTouch:true,isMobile:true});const page=await context.newPage();const cdp=await context.newCDPSession(page);page.setDefaultTimeout(3500);
 const run=async(name,fn)=>{try{await page.goto(`http://127.0.0.1:5198/?engine=${engine}`);await page.locator('[data-card=a]').waitFor();await fn();report.cases.push({engine,name,configuration:{touch:true},pass:true});console.log('PASS',engine,name);}catch(error){report.cases.push({engine,name,configuration:{touch:true},pass:false,error:error.message});console.log('FAIL',engine,name,error.message);}};
 const send=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:2,radiusY:2}]});
 await run('touch hold moves to empty column',async()=>{const a=await page.locator('[data-card=a]').boundingBox();const b=await page.locator('[data-column=empty]').boundingBox();await send('touchStart',a.x+a.width/2,a.y+15);await page.waitForTimeout(320);for(let i=1;i<=12;i++){await send('touchMove',a.x+15+(b.x+100-a.x-15)*i/12,a.y+15);await page.waitForTimeout(18);}await send('touchEnd',0,0);await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-tasks]').textContent)[0].status==='empty');assert.equal(JSON.parse(await page.locator('[data-calls]').textContent()).length,1);});
 await run('touch move before hold does not move task',async()=>{const a=await page.locator('[data-card=a]').boundingBox();await send('touchStart',a.x+a.width/2,a.y+15);await send('touchMove',a.x+60,a.y+15);await send('touchEnd',0,0);await page.waitForTimeout(350);assert.deepEqual(JSON.parse(await page.locator('[data-calls]').textContent()),[]);assert.equal(JSON.parse(await page.locator('[data-tasks]').textContent())[0].status,'todo');});
 await context.close();
}
}catch(error){report.errors.push(error.stack);}finally{await browser.close();report.completedAt=new Date().toISOString();report.passed=report.cases.filter(c=>c.pass).length;report.failed=report.cases.filter(c=>!c.pass).length;writeFileSync(output+'/results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors}));process.exitCode=report.failed||report.errors.length?1:0;}

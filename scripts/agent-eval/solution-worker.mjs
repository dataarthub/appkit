// UNTRUSTED process. Every outgoing byte, including this transport after import, is untrusted.
import {writeSync} from 'node:fs';
import {createInterface} from 'node:readline';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const [file,taskId]=process.argv.slice(2),handles=new Map(),callbacks=new Map(),require=createRequire(file);let next=0,view,testing,React,dom;
const write=value=>writeSync(3,JSON.stringify(value)+'\n');
function decode(value){if(value&&typeof value==='object'&&typeof value.__callback==='string')return (...args)=>new Promise((resolve,reject)=>{const callId=String(++next);callbacks.set(callId,{resolve,reject});write({type:'callback',callbackId:value.__callback,callId,args});});return value;}
async function form(action,request){
 if(action==='render'){
  const adapter=new Proxy({}, {get(_t,name){return (...args)=>decode(request.adapter)(String(name),args);}});
  view=testing.render(React.createElement(handles.get(0).RequestForm,{adapter}));
  return {name:!!view.queryByRole('textbox',{name:/^name/i}),reason:!!view.queryByRole('textbox',{name:/reason/i})};
 }
 const input=view.getByRole('textbox',{name:/^name/i}),form=input.closest('form');if(!form)throw Error('No form');
 if(action==='change')testing.fireEvent.change(input,{target:{value:request.value}});
 else if(action==='submit')testing.fireEvent.submit(form);
 else if(action==='close'){testing.cleanup();dom.window.close();return null;}
 else throw Error('Unknown form command');
 await new Promise(r=>setTimeout(r,100));return null;
}
async function execute(request){
 if(request.op==='load'){
  if(taskId==='react-form'){
   const {JSDOM}=require('jsdom');dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
   for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
   React=require('react');testing=require('@testing-library/react');
  }
  handles.set(0,await import(pathToFileURL(file).href));return true;
 }
 if(request.op==='form')return form(request.action,request);
 if(request.op!=='call'||!handles.has(request.target)||!Array.isArray(request.path))throw Error('Unknown operation');
 let owner=handles.get(request.target);for(const name of request.path.slice(0,-1))owner=owner[name];const value=await owner[request.path.at(-1)](...request.args.map(decode));
 if(request.handle){const id=++next;handles.set(id,value);return id;}return value;
}
createInterface({input:process.stdin}).on('line',line=>{let request;try{request=JSON.parse(line);}catch{return process.exit(1);}
 if(request.type==='callback-result'){const p=callbacks.get(request.callId);if(p){callbacks.delete(request.callId);request.error?p.reject(Error('Callback failed')):p.resolve(request.value);}return;}
 Promise.resolve().then(()=>execute(request)).then(value=>write({type:'result',id:request.id,ok:true,value}),error=>write({type:'result',id:request.id,ok:false,error:String(error?.message??error).slice(0,1000)}));
});

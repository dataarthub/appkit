import {test,expect} from 'bun:test';
import {initGoogleAuth,requestAccessToken,clearToken,getAuthConfig,signOut,getAccessToken} from './gis-auth';
import type {TokenResponse} from './types';
test('OAuth shares pending requests, resets configuration and ignores obsolete callbacks',async()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'google');
  type Config={callback:(r:TokenResponse)=>void;error_callback:(e:{type:string})=>void;client_id:string};
  const clients:Config[]=[];let requests=0;
  Object.defineProperty(globalThis,'google',{configurable:true,value:{accounts:{oauth2:{initTokenClient:(c:Config)=>{clients.push(c);return {requestAccessToken:()=>{requests++;}};},revoke:(_t:string,cb:()=>void)=>cb()}}}});
  const response=(token:string):TokenResponse=>({access_token:token,expires_in:3600,token_type:'Bearer',scope:'a'});
  try{
    clearToken();await initGoogleAuth({clientId:'A',scopes:['a']});
    const a=requestAccessToken(),b=requestAccessToken();expect(a).toBe(b);expect(requests).toBe(1);
    clients[0]!.callback(response('token-A'));expect((await a).access_token).toBe('token-A');await b;
    await initGoogleAuth({clientId:'B',scopes:['b']});expect(getAccessToken()).toBeNull();
    const pending=requestAccessToken();clients[0]!.callback(response('stale'));expect(getAccessToken()).toBeNull();
    clients[1]!.error_callback({type:'popup_closed'});await expect(pending).rejects.toThrow('popup_closed');
    const retry=requestAccessToken();clients[1]!.callback(response('token-B'));await retry;
    const cfg=getAuthConfig()!;cfg.scopes!.push('mutated');expect(getAuthConfig()?.scopes).toEqual(['b']);
    signOut();expect(getAccessToken()).toBeNull();
    await initGoogleAuth({clientId:'C'});const cancelled=requestAccessToken();clearToken();await expect(cancelled).rejects.toThrow('cancelled');
  }finally{clearToken();if(old)Object.defineProperty(globalThis,'google',old);else Reflect.deleteProperty(globalThis,'google');}
});

test('failed GIS script loading removes the script and can be retried',async()=>{
  const descriptors=['google','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  let script:{id:string;onload:()=>void;onerror:()=>void;remove:()=>void}|null=null;let appended=0;
  Reflect.deleteProperty(globalThis,'google');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:()=>script,createElement:()=>({remove:()=>{script=null;}}),head:{appendChild:(value:typeof script)=>{script=value;appended++;}}}});
  try{
    clearToken();const first=initGoogleAuth({clientId:'retry'});(script as unknown as {onerror:()=>void}).onerror();await expect(first).rejects.toThrow('Failed to load');expect(script).toBeNull();
    const second=initGoogleAuth({clientId:'retry'});expect(appended).toBe(2);
    Object.defineProperty(globalThis,'google',{configurable:true,value:{accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>{}})}}}});
    (script as unknown as {onload:()=>void}).onload();await second;
  }finally{clearToken();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});

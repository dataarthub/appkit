import {ActionRegistry,createActionToolBridge,createAjvValidator} from '@alneas/appkit-core/ai';
export function createToolScenario(onWrite:(args:{name:string})=>Promise<{name:string;secret:string}>){
 const registry=new ActionRegistry(),validate=createAjvValidator(),schema={type:'object' as const,properties:{name:{type:'string',minLength:1}},required:['name'],additionalProperties:false};
 const unregister=registry.registerAction<{name:string},{name:string;secret:string}>({id:'rename',description:'Rename',validate(input){return input&&typeof input==='object'&&'name' in input&&typeof input.name==='string'&&validate(schema,input).valid?{ok:true,data:{name:input.name}}:{ok:false,error:'Invalid input'};},handler:onWrite});
 const bridge=createActionToolBridge(registry,{tools:[{kind:'action',actionId:'rename',name:'rename_record',description:'Rename',inputSchema:schema,mapOutput:value=>({name:value&&typeof value==='object'&&'name' in value&&typeof value.name==='string'?value.name:''})}]});
 return {bridge,close(){bridge.close();unregister();}};
}

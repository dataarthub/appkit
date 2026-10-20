import {ERROR_CATALOG} from './catalog';
export type AIErrorDomain = keyof typeof ERROR_CATALOG;
export type AIChatErrorCode = keyof typeof ERROR_CATALOG.chat;
export interface AIErrorInfo {readonly docsUrl:string; readonly guide:string; readonly recovery:string}
/** Fixed recovery metadata; unknown codes return undefined. Does not fetch documentation or retry. */
export function getAIErrorInfo(domain:AIErrorDomain,code:string):AIErrorInfo|undefined {
 const table=ERROR_CATALOG[domain] as Record<string,{readonly recovery:string}>;
 if(!table||!Object.hasOwn(table,code))return undefined;
 const guide='docs/ai-errors.md#'+domain+'-'+code.toLowerCase().replaceAll('_','-');
 return Object.freeze({guide,docsUrl:'https://github.com/dataarthub/appkit/blob/main/packages/appkit-core/'+guide,recovery:table[code].recovery});
}
/** An Appkit-owned chat failure. Caller errors and AbortError are not automatically wrapped. */
export class AIChatError extends Error {
 readonly code:AIChatErrorCode; readonly docsUrl:string; readonly recovery:string;
 constructor(code:AIChatErrorCode,message:string){super(message);this.name='AIChatError';this.code=code;const info=getAIErrorInfo('chat',code)!;this.docsUrl=info.docsUrl;this.recovery=info.recovery;}
}

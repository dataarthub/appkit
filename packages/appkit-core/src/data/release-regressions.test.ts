import {test,expect} from 'bun:test';
import { Database } from 'bun:sqlite';
import { generateZodSchema, generateZodSchemaCode, type JSONSchema } from './schema/compiler';
import { createAjvValidator } from './schema/ajv';
import { buildJsonMergeExpression } from './schema/json-extensions';
import { setTime, getTodayDateString } from './date-utils';
import { verifySignature } from './notifications/line/webhook-handler';
import { createHmac } from 'node:crypto';

test('implemented schema combinations agree with AJV and preserve allowed extra properties',()=>{
  const cases: [JSONSchema,unknown][] = [
    [{type:'null'},123], [{type:['null']},123], [{type:'string',enum:['x','long'],minLength:2},'x'],
    [{type:'object',additionalProperties:false},{extra:true}],
  ];
  for(const [property,value] of cases){
    const schema:JSONSchema={type:'object',properties:{value:property},required:['value']};
    expect(createAjvValidator()(schema,{value}).valid).toBe(false);
    expect(generateZodSchema(schema).safeParse({value}).success).toBe(false);
  }
  expect(generateZodSchema({type:'object',properties:{}}).parse({extra:true})).toEqual({extra:true});
});
test('generated code safely embeds titles keys patterns and enum values',()=>{
  const schema:JSONSchema={title:'Sales invoice',type:'object',properties:{'display-name':{type:'string',enum:["O'Reilly",'a/b'],pattern:'a/b|Reilly'}},required:['display-name']};
  const code=generateZodSchemaCode(schema);
  // Execute the actual generated body using the same explicitly imported runtime converter.
  const body=code.replace(/^import[^\n]+\n/,'').replace('export const ','const ');
  const parsed=new Function('generateZodSchema',body+';return Sales_invoiceSchema;')(generateZodSchema);
  expect(parsed.safeParse({'display-name':"O'Reilly"}).success).toBe(true);
  expect(parsed.safeParse({'display-name':'wrong'}).success).toBe(false);
});
test('JSON merge binds ordinary scalars as valid JSON in real SQLite',()=>{
  const db=new Database(':memory:');
  try{
    db.exec("create table docs (data text); insert into docs values ('{}')");
    for(const value of ['hello','"quoted"',0,false,null,[1],{x:'y'}]){
      const expression=buildJsonMergeExpression('data','value',value,'sqlite');
      // The public helper returns one JSON patch binding.
      const result=db.query(`select ${expression.valueExpression} as value from docs`).get(expression.paramValue as string) as {value:string};
      expect(JSON.parse(result.value)).toEqual({value});
    }
  }finally{db.close();}
});
test('wall times resolve fractional offsets and DST at the requested date',()=>{
  expect(setTime(new Date('2024-01-15T00:00:00Z'),9,0,0,'America/St_Johns').toISOString()).toBe('2024-01-14T12:30:00.000Z');
  expect(setTime(new Date('2024-01-15T12:00:00Z'),9,0,0,'Asia/Kathmandu').toISOString()).toBe('2024-01-15T03:15:00.000Z');
  expect(setTime(new Date('2024-03-10T18:00:00Z'),1,0,0,'America/New_York').toISOString()).toBe('2024-03-10T06:00:00.000Z');
  expect(()=>setTime(new Date('2024-03-10T18:00:00Z'),2,30,0,'America/New_York')).toThrow('exist');
  expect(setTime(new Date('2024-11-03T18:00:00Z'),1,30,0,'America/New_York').toISOString()).toBe('2024-11-03T05:30:00.000Z');
});
test('dormant LINE signature helper rejects altered payload and arbitrary signatures',()=>{
  const body='{"events":[]}';
  const signature=createHmac('sha256','secret').update(body).digest('base64');
  expect(verifySignature(body,signature,'secret')).toBe(true);
  expect(verifySignature(body+' ',signature,'secret')).toBe(false);
  expect(verifySignature(body,'anything','secret')).toBe(false);
});

test('today uses the requested timezone across the international date line',()=>{
  const OriginalDate=Date;
  class FrozenDate extends OriginalDate { constructor(value?:string|number|Date){super(value??'2024-01-01T12:00:00Z');} }
  globalThis.Date=FrozenDate as typeof Date;
  try{expect(getTodayDateString('Pacific/Kiritimati')).toBe('2024-01-02');expect(getTodayDateString('Pacific/Honolulu')).toBe('2024-01-01');}finally{globalThis.Date=OriginalDate;}
});

import {describe,it,expect} from 'vitest';
import {createAjvResolver} from './ajv';
describe('React Hook Form resolver error updates',()=>{
 it('keeps validation-error leaves writable when an invalid field is edited',async()=>{
  const resolver=createAjvResolver<{name:string}>({type:'object',properties:{name:{type:'string',minLength:2}},required:['name']},{locale:'en',emptyStrings:'preserve'});
  const result=await resolver({name:''});expect(result.errors.name).toBeDefined();
  expect(()=>{result.errors.name={type:'minLength',message:'Edited invalid input'};}).not.toThrow();
  expect(result.errors.name?.message).toBe('Edited invalid input');
  expect((await resolver({name:'Name'})).errors).toEqual({});
 });
});

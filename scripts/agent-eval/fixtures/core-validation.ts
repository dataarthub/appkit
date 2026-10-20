import {createAjvValidator} from '@alneas/appkit-core/ai';
const validate=createAjvValidator();const schema={type:'object',properties:{name:{type:'string',minLength:2},amount:{type:'number',minimum:0}},required:['name','amount'],additionalProperties:false};
export const validateRecord=(data:unknown)=>validate(schema,data);

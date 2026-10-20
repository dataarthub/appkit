import {createAjvValidator} from '@alneas/appkit-core/ai';
const validate=createAjvValidator();const schema={type:'object',properties:{name:{type:'string',minLength:2}},required:['name'],additionalProperties:false};
export const validateName=(data:unknown)=>validate(schema,data);

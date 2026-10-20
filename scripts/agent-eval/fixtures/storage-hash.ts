import {sha256Hex} from '@alneas/appkit-core/storage';export const hashText=(text:string)=>sha256Hex(text);

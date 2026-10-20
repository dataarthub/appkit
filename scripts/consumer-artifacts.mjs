import path from 'node:path';import {randomUUID} from 'node:crypto';
export const candidateArtifactDirectory=root=>path.join(root,'.verification/artifacts','candidate-'+Date.now()+'-'+randomUUID());

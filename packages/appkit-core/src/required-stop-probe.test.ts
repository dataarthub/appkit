import {test,expect} from 'bun:test';
test('Verification-only required failure stops the source gate',()=>expect(false).toBe(true));

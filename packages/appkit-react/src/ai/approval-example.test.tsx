// @vitest-environment jsdom
import {test,expect,vi,afterEach} from 'vitest';import {render,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {RenameToolReview} from '../../examples/approved-tool-review';
afterEach(cleanup);
test('review UI never approves by rendering, and explicit reject does not approve',async()=>{
 const approve=vi.fn(async()=>{}),reject=vi.fn(),onSettled=vi.fn();const pending={approvalId:'p1',recordId:'r1',name:'New name'};
 const v=render(<RenameToolReview example={{approve,reject}} pending={pending} onSettled={onSettled}/>);expect(approve).not.toHaveBeenCalled();fireEvent.click(v.getByText('Reject'));expect(reject).toHaveBeenCalledWith('p1');expect(approve).not.toHaveBeenCalled();
 v.rerender(<RenameToolReview example={{approve,reject}} pending={{...pending,approvalId:'p2'}} onSettled={onSettled}/>);fireEvent.click(v.getByText('Approve'));await waitFor(()=>expect(approve).toHaveBeenCalledWith('p2'));
});

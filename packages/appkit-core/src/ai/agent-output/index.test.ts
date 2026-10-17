import { describe, expect, it } from 'bun:test';
import { extractAgentMessageText } from './index';

describe('extractAgentMessageText', () => {
  it('joins completed agent messages and ignores progress lines', () => {
    const output = [
      'starting',
      JSON.stringify({ type: 'item.completed', item: { type: 'tool_call', text: 'ignored' } }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'first' } }),
      '{partial',
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'second' } }),
    ].join('\n');
    expect(extractAgentMessageText(output)).toBe('first\n\nsecond');
  });

  it('returns raw output when no completed message exists', () => {
    expect(extractAgentMessageText('starting\nnot-json')).toBe('starting\nnot-json');
  });
});

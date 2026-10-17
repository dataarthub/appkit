import { expect, test } from 'bun:test';
import { WorkflowEngine, WorkflowPolicyEngine } from './index';

test('configured transitions, actions, fallback and position progress preserve metadata references', () => {
  const transition = { from: 'new', to: 'done', label: 'Finish', requiresApproval: true };
  const action = { action: 'save', enabledStatuses: ['new'], extra: 1 };
  const info = { title: 'New' },
    fallback = { title: 'Unknown' };
  const config = {
    id: 'example',
    label: 'Example',
    statusOrder: ['new', 'done'],
    transitions: [transition],
    actions: [action],
    statusInfo: { new: info },
    defaultStatusInfo: fallback,
  };
  const engine = new WorkflowEngine(config);
  expect(engine.getTransitions('new')).toEqual([transition]);
  expect(engine.getTransitions('done')).toEqual([]);
  expect(engine.getActions('new')[0]).toBe(action);
  expect(engine.getActions('done')).toEqual([]);
  expect(engine.getStatusInfo('new')).toBe(info);
  expect(engine.getStatusInfo('constructor')).toBe(fallback);
  expect(engine.getStatusInfo('missing')).toBe(fallback);
  expect(engine.getProgress('new')).toBe(50);
  expect(engine.getProgress('done')).toBe(100);
  expect(engine.getProgress('missing')).toBe(0);
  expect(engine.getStatusOrder()).toBe(config.statusOrder);
  expect(engine.getLabel()).toBe('Example');
  expect(
    new WorkflowEngine({ ...config, statusOrder: [], actions: undefined }).getProgress('new'),
  ).toBe(0);
});
test('application explicitly supplies policy decisions; no default monetary or document rules', () => {
  expect(() => new WorkflowPolicyEngine(null as any)).toThrow(/explicit/);
  expect(() => new WorkflowPolicyEngine({} as any)).toThrow(/complete/);
  const engine = new WorkflowPolicyEngine<{ authorized: boolean }>({
    validateTransition: (context) => ({ allowed: context.authorized }),
    requiresApproval: (context) => !context.authorized,
    getRequiredFields: () => ['customField'],
  });
  expect(engine.validateTransition({ authorized: false })).toEqual({ allowed: false });
  expect(engine.requiresApproval({ authorized: true })).toBe(false);
  expect(engine.getRequiredFields({ authorized: true })).toEqual(['customField']);
});

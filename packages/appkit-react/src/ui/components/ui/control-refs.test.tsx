// @vitest-environment jsdom
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, expectTypeOf, test, vi } from 'vitest';
import { Button, type ButtonProps } from './button-components';
import { MobileButton, FAB, type MobileButtonProps, type FABProps } from './mobile-form';
import { Input, type InputProps } from './input';
import { PasswordInput } from './password-input';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Toggle } from './toggle-components';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
import { Slider } from './slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectInput } from './select';

afterEach(cleanup);

type FormerProps<P, E> = React.PropsWithoutRef<P> & React.RefAttributes<E>;
test('control props preserve their public ref types, including polymorphic HTMLElement refs', () => {
  execFileSync(process.execPath, [
    createRequire(import.meta.url).resolve('typescript/lib/tsc.js'),
    '--ignoreConfig', '--noEmit', '--strict', '--skipLibCheck', '--types', 'node',
    '--jsx', 'react-jsx', '--esModuleInterop', '--target', 'es2022',
    '--module', 'esnext', '--moduleResolution', 'bundler', fileURLToPath(import.meta.url),
  ], { stdio: 'inherit' });
  expectTypeOf<React.ComponentProps<typeof Button>>().toEqualTypeOf<FormerProps<ButtonProps, HTMLElement>>();
  expectTypeOf<React.ComponentProps<typeof MobileButton>>().toEqualTypeOf<FormerProps<MobileButtonProps, HTMLElement>>();
  expectTypeOf<React.ComponentProps<typeof FAB>>().toEqualTypeOf<FormerProps<FABProps, HTMLElement>>();
  expectTypeOf<React.ComponentProps<typeof Input>>().toEqualTypeOf<FormerProps<InputProps, HTMLInputElement>>();
  expectTypeOf<React.ComponentProps<typeof PasswordInput>>().toEqualTypeOf<FormerProps<InputProps, HTMLInputElement>>();
  expectTypeOf<React.ComponentProps<typeof Checkbox>['ref']>().toEqualTypeOf<React.Ref<HTMLButtonElement> | undefined>();
  expectTypeOf<React.ComponentProps<typeof Switch>['ref']>().toEqualTypeOf<React.Ref<HTMLButtonElement> | undefined>();
  expectTypeOf<React.ComponentProps<typeof RadioGroupItem>['ref']>().toEqualTypeOf<React.Ref<HTMLButtonElement> | undefined>();
  expectTypeOf<React.ComponentProps<typeof Toggle>['ref']>().toEqualTypeOf<React.Ref<HTMLButtonElement> | undefined>();
  expectTypeOf<React.ComponentProps<typeof AccordionTrigger>['ref']>().toEqualTypeOf<React.Ref<HTMLButtonElement> | undefined>();
  expectTypeOf<React.ComponentProps<typeof Slider>['ref']>().toEqualTypeOf<React.Ref<HTMLDivElement> | undefined>();
});

test.each([
  ['Button', Button, {}],
  ['MobileButton', MobileButton, {}],
  ['FAB', FAB, { icon: <span aria-hidden='true'>+</span>, label: 'Create' }],
] as const)('%s composes anchor render targets, merges refs and releases callbacks', (_name, Component, extra) => {
  const objectRef = React.createRef<HTMLElement>();
  const renderRef = React.createRef<HTMLAnchorElement>();
  const onClick = vi.fn();
  const props = {
    ...extra,
    testId: 'action',
    nativeButton: false,
    render: <a href='#destination' ref={renderRef} />,
    className: (state: { disabled: boolean }) => state.disabled ? 'inactive' : 'active',
    onClick,
  };
  // FAB requires an icon; the union above supplies it for its corresponding case.
  const view = render(React.createElement(Component as React.ElementType, { ...props, ref: objectRef }, 'Go'));
  const anchor = view.getByTestId('action');
  expect(anchor.tagName).toBe('A');
  expect(anchor.getAttribute('href')).toBe('#destination');
  expect(objectRef.current).toBe(anchor);
  expect(renderRef.current).toBe(anchor);
  expect(anchor.classList.contains('active')).toBe(true);
  fireEvent.click(anchor);
  expect(onClick).toHaveBeenCalledTimes(1);
  let attached: HTMLElement | null = null;
  const release = vi.fn();
  const callbackRef = (node: HTMLElement | null) => { attached = node; return release; };
  view.rerender(React.createElement(Component as React.ElementType, { ...props, ref: callbackRef, disabled: true }, 'Go'));
  expect(objectRef.current).toBeNull();
  expect(attached).toBe(anchor);
  expect(anchor.classList.contains('inactive')).toBe(true);
  fireEvent.click(anchor);
  expect(onClick).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(renderRef.current).toBeNull();
  expect(release).toHaveBeenCalledTimes(1);
});

test.each([Button, MobileButton])('loading buttons disable activation without losing their ref', (Component) => {
  const ref = React.createRef<HTMLElement>();
  const onClick = vi.fn();
  const view = render(<Component ref={ref} loading onClick={onClick}>Save</Component>);
  const button = view.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
  expect(ref.current).toBe(button);
  expect(button.disabled).toBe(true);
  expect(button.getAttribute('aria-busy')).toBe('true');
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
  view.rerender(<Component ref={ref} onClick={onClick}>Save</Component>);
  expect(ref.current).toBe(button);
  expect(button.disabled).toBe(false);
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('numeric Input forwards focus and normalizes user edits while preserving controlled stepping', async () => {
  const user = userEvent.setup();
  const ref = React.createRef<HTMLInputElement>();
  const keyDown = vi.fn();
  const values: string[] = [];
  function Quantity() {
    const [value, setValue] = React.useState('1.2');
    return <Input ref={ref} type='number' aria-label='Quantity' name='quantity' value={value} step='0.1'
      onKeyDown={keyDown} onChange={event => { values.push(event.target.value); setValue(event.target.value); }} />;
  }
  const view = render(<Quantity />);
  const input = view.getByRole('textbox', { name: 'Quantity' }) as HTMLInputElement;
  expect(ref.current).toBe(input);
  expect(input.type).toBe('text');
  expect(input.inputMode).toBe('numeric');
  ref.current?.focus();
  expect(document.activeElement).toBe(input);
  await user.keyboard('{ArrowUp}{ArrowDown}');
  expect(values).toEqual(['1.3', '1.2']);
  expect(input.value).toBe('1.2');
  expect(keyDown).toHaveBeenCalledTimes(2);
  await user.clear(input);
  await user.paste('－１２．３kg');
  expect(values.at(-1)).toBe('-12.3');
  expect(input.value).toBe('-12.3');
  view.unmount();
  expect(ref.current).toBeNull();
});

test('PasswordInput visibility changes preserve the input, value and callback ref', async () => {
  const user = userEvent.setup();
  const ref = React.createRef<HTMLInputElement>();
  const view = render(<PasswordInput ref={ref} aria-label='Password' defaultValue='secret' />);
  const input = view.getByLabelText('Password') as HTMLInputElement;
  expect(ref.current).toBe(input);
  expect(input.type).toBe('password');
  await user.click(view.getByRole('button', { name: 'Show password' }));
  expect(ref.current).toBe(input);
  expect(input.type).toBe('text');
  expect(input.value).toBe('secret');
  let attached: HTMLInputElement | null = null;
  const callbackRef = (node: HTMLInputElement | null) => { attached = node; };
  view.rerender(<PasswordInput ref={callbackRef} aria-label='Password' defaultValue='secret' />);
  expect(ref.current).toBeNull();
  expect(attached).toBe(input);
  await user.click(view.getByRole('button', { name: 'Hide password' }));
  expect(input.type).toBe('password');
  expect(attached).toBe(input);
  view.unmount();
  expect(attached).toBeNull();
});

test('checkbox, switch and toggle keep their control refs during pointer and keyboard state changes', async () => {
  const user = userEvent.setup();
  const checkboxRef = React.createRef<HTMLButtonElement>();
  const switchRef = React.createRef<HTMLButtonElement>();
  const toggleRef = React.createRef<HTMLButtonElement>();
  const changed = vi.fn();
  const view = render(<><Checkbox ref={checkboxRef} aria-label='Agree' onCheckedChange={changed} />
    <Switch ref={switchRef} aria-label='Notifications' /><Toggle ref={toggleRef} aria-label='Bold'>B</Toggle></>);
  for (const [ref, role, name, attribute] of [
    [checkboxRef, 'checkbox', 'Agree', 'aria-checked'],
    [switchRef, 'switch', 'Notifications', 'aria-checked'],
    [toggleRef, 'button', 'Bold', 'aria-pressed'],
  ] as const) {
    const control = view.getByRole(role, { name });
    expect(ref.current).toBe(control);
    expect(control.getAttribute(attribute)).toBe('false');
    await user.click(control);
    expect(control.getAttribute(attribute)).toBe('true');
    ref.current?.focus();
    await user.keyboard(' ');
    expect(control.getAttribute(attribute)).toBe('false');
    expect(ref.current).toBe(control);
  }
  expect(changed).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(checkboxRef.current).toBeNull();
  expect(switchRef.current).toBeNull();
  expect(toggleRef.current).toBeNull();
});

test('radio and accordion composition forward refs to each slot while selection and expansion work', async () => {
  const user = userEvent.setup();
  const radioRef = React.createRef<HTMLButtonElement>();
  const groupRef = React.createRef<HTMLDivElement>();
  const accordionRef = React.createRef<HTMLDivElement>();
  const itemRef = React.createRef<HTMLDivElement>();
  const triggerRef = React.createRef<HTMLButtonElement>();
  const panelRef = React.createRef<HTMLDivElement>();
  const view = render(<><RadioGroup ref={groupRef} defaultValue='email' aria-label='Contact'>
    <RadioGroupItem value='email' aria-label='Email' /><RadioGroupItem ref={radioRef} value='phone' aria-label='Phone' />
  </RadioGroup><Accordion ref={accordionRef}><AccordionItem ref={itemRef} value='details'>
    <AccordionTrigger ref={triggerRef}>Details</AccordionTrigger>
    <AccordionContent ref={panelRef}>Project details</AccordionContent>
  </AccordionItem></Accordion></>);
  expect(groupRef.current).toBe(view.getByRole('radiogroup'));
  const radio = view.getByRole('radio', { name: 'Phone' });
  expect(radioRef.current).toBe(radio);
  await user.click(radio);
  expect(radio.getAttribute('aria-checked')).toBe('true');
  expect(view.getByRole('radio', { name: 'Email' }).getAttribute('aria-checked')).toBe('false');
  const trigger = view.getByRole('button', { name: 'Details' });
  expect(triggerRef.current).toBe(trigger);
  expect(accordionRef.current?.getAttribute('data-slot')).toBe('accordion');
  expect(itemRef.current?.getAttribute('data-slot')).toBe('accordion-item');
  await user.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(panelRef.current).toBe(view.getByRole('region'));
  expect(panelRef.current?.textContent).toBe('Project details');
  view.unmount();
  for (const ref of [radioRef, groupRef, accordionRef, itemRef, triggerRef, panelRef]) expect(ref.current).toBeNull();
});

test('Slider ref stays on its root while keyboard input updates the labelled thumb', async () => {
  const user = userEvent.setup();
  const ref = React.createRef<HTMLDivElement>();
  const changed = vi.fn();
  const view = render(<Slider ref={ref} aria-label='Volume' defaultValue={20} step={5} onValueChange={changed} />);
  // jsdom has no thumb layout, so Base UI initially hides the visual thumb.
  const thumb = view.getByLabelText('Volume');
  expect(ref.current?.getAttribute('data-slot')).toBe('slider');
  expect(ref.current?.contains(thumb)).toBe(true);
  expect(ref.current).not.toBe(thumb);
  thumb.focus();
  await user.keyboard('{ArrowRight}');
  expect(thumb.getAttribute('aria-valuenow')).toBe('25');
  expect(changed).toHaveBeenCalled();
  view.unmount();
  expect(ref.current).toBeNull();
});

test('SelectTrigger forwards to the provider-connected opener and selects an option', async () => {
  const user = userEvent.setup();
  const ref = React.createRef<HTMLButtonElement>();
  const view = render(<Select defaultValue='date'><SelectTrigger ref={ref} aria-label='Sort'>
    <SelectValue /></SelectTrigger><SelectContent alignItemWithTrigger={false}>
    <SelectItem value='date'>Date</SelectItem><SelectItem value='name'>Name</SelectItem>
  </SelectContent></Select>);
  const trigger = view.getByRole('combobox', { name: 'Sort' });
  expect(ref.current).toBe(trigger);
  trigger.focus();
  await user.keyboard('{ArrowDown}');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  await user.click(await view.findByRole('option', { name: 'Name' }));
  expect(trigger.textContent).toContain('name');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(ref.current).toBe(trigger);
  view.unmount();
  expect(ref.current).toBeNull();
});

test('SelectInput forwards callback refs through its trigger and updates the displayed label', async () => {
  const user = userEvent.setup();
  let attached: HTMLButtonElement | null = null;
  const callbackRef = (node: HTMLButtonElement | null) => { attached = node; };
  const onValueChange = vi.fn();
  function Order() {
    const [value, setValue] = React.useState<string | null>('date');
    return <SelectInput ref={callbackRef} aria-label='Order' value={value}
      options={[{ value: 'date', label: 'Date' }, { value: 'name', label: 'Name' }]}
      onValueChange={(next, details) => { onValueChange(next, details); setValue(next === null ? null : String(next)); }} />;
  }
  const view = render(<Order />);
  const trigger = view.getByRole('combobox', { name: 'Order' });
  expect(attached).toBe(trigger);
  await user.click(trigger);
  await user.click(await view.findByRole('option', { name: 'Name' }));
  expect(trigger.textContent).toContain('Name');
  expect(onValueChange.mock.calls[0]?.[0]).toBe('name');
  expect(attached).toBe(trigger);
  view.unmount();
  expect(attached).toBeNull();
});

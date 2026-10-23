// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

afterEach(cleanup);

const schema = z.object({
  email: z.email('Invalid email'),
  age: z.coerce
    .number<string>()
    .int('Whole number required')
    .min(18, 'Adult required'),
});

test('RHF submits transformed Zod output and keeps input types distinct', async () => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() =>
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { email: 'a@example.com', age: '21' },
    }),
  );
  await act(async () => {
    await result.current.handleSubmit(onSubmit)();
  });
  expect(onSubmit.mock.calls[0]?.[0]).toEqual({
    email: 'a@example.com',
    age: 21,
  });
  expect(result.current.getValues('age')).toBe('21');
});

test('invalid coerced values block submission and retain field messages', async () => {
  const onSubmit = vi.fn();
  const onInvalid = vi.fn();
  const { result } = renderHook(() =>
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { email: 'bad', age: '17.5' },
      criteriaMode: 'all',
    }),
  );
  await act(async () => {
    await result.current.handleSubmit(onSubmit, onInvalid)();
  });
  expect(onSubmit).not.toHaveBeenCalled();
  const errors = onInvalid.mock.calls[0]?.[0];
  expect(errors.email.message).toBe('Invalid email');
  expect(errors.age.message).toBe('Whole number required');
  expect(errors.age.types.invalid_type).toBe('Whole number required');
});

test('async schema refinements remain awaited before submission', async () => {
  const asyncSchema = z.object({
    username: z
      .string()
      .refine(async (value) => value !== 'taken', 'Already registered'),
  });
  const onSubmit = vi.fn();
  const onInvalid = vi.fn();
  const { result } = renderHook(() =>
    useForm({
      resolver: zodResolver(asyncSchema),
      defaultValues: { username: 'taken' },
    }),
  );
  await act(async () => {
    await result.current.handleSubmit(onSubmit, onInvalid)();
  });
  expect(onSubmit).not.toHaveBeenCalled();
  expect(onInvalid.mock.calls[0]?.[0].username.message).toBe(
    'Already registered',
  );
  act(() => result.current.setValue('username', 'available'));
  await act(async () => {
    await result.current.handleSubmit(onSubmit)();
  });
  expect(onSubmit.mock.calls[0]?.[0]).toEqual({ username: 'available' });
});

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, AutoFormField } from '../../../src/tools/components/ui/form';
import { Input } from '../../../src/tools/components/ui/input';
import { Button } from '../../../src/tools/components/ui/button';

const meta = {
  title: 'UI/Form',
  component: Form.Root, // Use Form.Root as the main component reference
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Form.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

const formSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

export const AdvancedLayout: Story = {
  render: () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        username: '',
        email: '',
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
      console.log(values);
    }

    return (
      <Form.Root
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-6 w-[500px] border p-10 rounded-xl shadow-lg bg-card'
      >
        <h2 className='text-xl font-bold mb-4'>Account Settings</h2>

        <AutoFormField
          control={form.control}
          name='username'
          label='Username'
          labelPosition='left'
          labelWidth='120px'
          description='Your public display name.'
          required
          inputProps={{ placeholder: 'johndoe' }}
        />

        <AutoFormField
          control={form.control}
          name='email'
          label='Email Address'
          labelPosition='none'
          overlappingLabel
          description='Required for login.'
          required
          inputProps={{ placeholder: 'example@mail.com' }}
        />

        <div className='flex justify-end gap-2 pt-4'>
          <Button variant='outline' type='button' onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type='submit'>Save Changes</Button>
        </div>
      </Form.Root>
    );
  },
};

export const Default: Story = {
  render: () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        username: '',
        email: '',
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
      console.log(values);
    }

    return (
      <Form.Root onSubmit={form.handleSubmit(onSubmit)} className='space-y-8 w-[400px]'>
        <Controller
          control={form.control}
          name='username'
          render={({ field, fieldState }) => (
            <Form.Field invalid={!!fieldState.error}>
              <Form.Label>Username</Form.Label>
              <Form.Control render={<Input placeholder='shadcn' {...field} />} />
              <p className='text-sm text-muted-foreground'>This is your public display name.</p>
              <Form.Error>{fieldState.error?.message}</Form.Error>
            </Form.Field>
          )}
        />
        <Controller
          control={form.control}
          name='email'
          render={({ field, fieldState }) => (
            <Form.Field invalid={!!fieldState.error}>
              <Form.Label>Email</Form.Label>
              <Form.Control render={<Input placeholder='email@example.com' {...field} />} />
              <p className='text-sm text-muted-foreground'>
                We'll never share your email with anyone else.
              </p>
              <Form.Error>{fieldState.error?.message}</Form.Error>
            </Form.Field>
          )}
        />
        <Button type='submit'>Submit</Button>
      </Form.Root>
    );
  },
};

export const AutoFieldForm: Story = {
  render: () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        username: '',
        email: '',
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
      console.log(values);
    }

    return (
      <Form.Root onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 w-[400px]'>
        <div className='space-y-2'>
          <h3 className='text-lg font-medium'>AutoFormField Example</h3>
          <p className='text-sm text-muted-foreground'>
            Using AutoFormField to simplify boilerplate.
          </p>
        </div>

        <AutoFormField
          control={form.control}
          name='username'
          label='Username'
          inputProps={{ placeholder: 'shadcn' }}
        />

        <AutoFormField
          control={form.control}
          name='email'
          label='Email'
          type='email'
          inputProps={{ placeholder: 'email@example.com' }}
          required
        />

        <Button type='submit'>Submit</Button>
      </Form.Root>
    );
  },
};

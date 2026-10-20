import { StoryAuthProvider } from '../../providers';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginForm, RegisterForm } from '../../../src/tools/components/auth/AuthForms';

const meta: Meta = {
  decorators: [(Story) => <StoryAuthProvider><Story /></StoryAuthProvider>],
  title: 'Auth/AuthForms',
  component: LoginForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Login: Story = {
  args: {
    onSuccess: () => console.log('Login success'),
    showRegisterLink: true,
    onRegisterClick: () => console.log('Go to register'),
  },
};

export const LoginNoRegisterLink: Story = {
  args: {
    onSuccess: () => console.log('Login success'),
    showRegisterLink: false,
  },
};

export const Register: Story = {
  render: (args: any) => <RegisterForm {...args} />,
  args: {
    onSuccess: () => console.log('Register success'),
    showLoginLink: true,
    onLoginClick: () => console.log('Go to login'),
  },
};

export const RegisterNoName: Story = {
  render: (args: any) => <RegisterForm {...args} />,
  args: {
    onSuccess: () => console.log('Register success'),
    fields: { name: { show: false } },
  },
};

export const RegisterCustomLabels: Story = {
  render: (args: any) => <RegisterForm {...args} />,
  args: {
    onSuccess: () => console.log('Register success'),
    fields: {
      name: { label: 'Full Name', placeholder: 'Your full name' },
      email: { label: 'Email Address' },
      password: { label: 'Create Password', placeholder: 'Min 6 characters' },
    },
  },
};

export const Loading: Story = {
  args: {
    isPending: true,
  },
};

export const GoogleOnlyLogin: Story = {
  args: {
    socialProviders: [{ provider: 'google', label: 'Googleでログイン' }],
    showEmailLogin: false,
    showRegisterLink: false,
  },
};

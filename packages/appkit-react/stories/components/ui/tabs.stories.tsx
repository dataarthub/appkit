import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../src/tools/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/tools/components/ui/card';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue='account' className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>
        <p>Account content</p>
      </TabsContent>
      <TabsContent value='password'>
        <p>Password content</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithCards: Story = {
  render: () => (
    <Tabs defaultValue='account' className='w-[400px]'>
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='space-y-1'>
              <label htmlFor='name'>Name</label>
              <input
                id='name'
                defaultValue='Pedro Duarte'
                className='w-full px-3 py-2 border rounded-md'
              />
            </div>
            <div className='space-y-1'>
              <label htmlFor='username'>Username</label>
              <input
                id='username'
                defaultValue='@peduarte'
                className='w-full px-3 py-2 border rounded-md'
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value='password'>
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='space-y-1'>
              <label htmlFor='current'>Current password</label>
              <input id='current' type='password' className='w-full px-3 py-2 border rounded-md' />
            </div>
            <div className='space-y-1'>
              <label htmlFor='new'>New password</label>
              <input id='new' type='password' className='w-full px-3 py-2 border rounded-md' />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue='overview' className='w-[500px]'>
      <TabsList className='grid w-full grid-cols-3'>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='analytics'>Analytics</TabsTrigger>
        <TabsTrigger value='reports'>Reports</TabsTrigger>
      </TabsList>
      <TabsContent value='overview'>
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>General overview of your data</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Overview content goes here</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value='analytics'>
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Detailed analytics and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Analytics content goes here</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value='reports'>
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Generated reports and exports</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Reports content goes here</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

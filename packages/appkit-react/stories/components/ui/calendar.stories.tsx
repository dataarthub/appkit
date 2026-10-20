import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar, DatePicker } from '../../../src/tools/components/ui/calendar';
import React from 'react';

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mode: 'single',
    selected: new Date(),
  },
};

export const CustomLocale: Story = {
  args: {
    mode: 'single',
    selected: new Date(),
    weekStartsOn: 0,
  },
};

export const DatePickerDefault: StoryObj<typeof DatePicker> = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <div className='w-[300px]'>
        <DatePicker
          {...({
            label: 'Delivery Date',
            date: date as any,
            setDate: setDate as any,
            placeholder: 'Pick a date',
          } as any)}
        />
      </div>
    );
  },
};

export const DatePickerAsDialog: StoryObj<typeof DatePicker> = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <div className='w-[300px]'>
        <DatePicker
          {...({
            label: 'Event Date',
            date: date as any,
            setDate: setDate as any,
            display: 'modal',
            placeholder: 'Pick a date',
          } as any)}
        />
      </div>
    );
  },
};

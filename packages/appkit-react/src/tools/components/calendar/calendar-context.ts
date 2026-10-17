import { createContext, useContext } from 'react';
import type { ResourceCalendarProps } from './types';

export const CalendarOptionsContext = createContext<
  Pick<ResourceCalendarProps, 'components' | 'businessHours'>
>({});
/** Shared overrides for built-in calendar views; optional for standalone views. */
export const useCalendarOptions = () => useContext(CalendarOptionsContext);

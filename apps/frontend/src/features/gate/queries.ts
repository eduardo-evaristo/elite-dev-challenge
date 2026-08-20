import { queryOptions } from '@tanstack/react-query';
import { getTodayEvents } from './api';

export const todayEventsOptions = queryOptions({
  queryKey: ['gate', 'events', 'today'],
  queryFn: getTodayEvents,
});

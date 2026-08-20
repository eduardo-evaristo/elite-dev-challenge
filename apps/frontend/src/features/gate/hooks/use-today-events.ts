import { useQuery } from '@tanstack/react-query';
import { todayEventsOptions } from '../queries';

export function useTodayEvents() {
  return useQuery(todayEventsOptions);
}

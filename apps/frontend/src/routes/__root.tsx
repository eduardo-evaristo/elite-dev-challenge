import * as React from 'react';
import {
  Outlet,
  createRootRoute,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { meQueryOptions } from '@/features/auth/queries';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
    beforeLoad: async ({ context }) => {
      await context.queryClient.ensureQueryData(meQueryOptions);
    },
  },
);

function RootComponent() {
  return (
    <React.Fragment>
      <Outlet />
    </React.Fragment>
  );
}
